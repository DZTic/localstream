package com.localstream.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import java.util.ArrayList;
import java.util.List;
import android.app.Activity;
import android.provider.DocumentsContract;
import android.database.Cursor;
import android.provider.MediaStore;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "VideoLauncher")
public class VideoLauncherPlugin extends com.getcapacitor.Plugin {

    @PluginMethod
    public void getList(PluginCall call) {
        JSONArray playersArray = new JSONArray();
        try {
            PackageManager pm = getContext().getPackageManager();

            String[] knownPackageIds = {
                "org.videolan.vlc",
                "org.videolan.vlc.debug",
                "com.mxtech.videoplayer.ad",
                "com.mxtech.videoplayer.pro",
                "org.courville.nova",
                "org.xbmc.kodi",
                "com.kmplayer",
                "com.bsplayer.bspandroid.free",
                "com.inshot.videoplayer",
                "com.videoplayer.videoplayer.movieplayer.allformat",
                "com.olimsoft.android.oplayer.free",
                "me.abitno.vplayer.t"
            };

            List<String> seenPackages = new ArrayList<>();
            for (String pkg : knownPackageIds) {
                try {
                    android.content.pm.ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
                    JSONObject player = new JSONObject();
                    player.put("name", pm.getApplicationLabel(ai).toString());
                    player.put("packageId", pkg);
                    playersArray.put(player);
                    seenPackages.add(pkg);
                } catch (Exception ignored) {}
            }

            try {
                Intent queryIntent = new Intent(Intent.ACTION_VIEW);
                queryIntent.setDataAndType(Uri.parse("content://dummy.mp4"), "video/*");
                List<ResolveInfo> resInfo = pm.queryIntentActivities(queryIntent, 0);
                for (ResolveInfo ri : resInfo) {
                    String pkg = ri.activityInfo.packageName;
                    if (!pkg.equals(getContext().getPackageName()) && !seenPackages.contains(pkg)) {
                        JSONObject player = new JSONObject();
                        player.put("name", ri.loadLabel(pm).toString());
                        player.put("packageId", pkg);
                        playersArray.put(player);
                        seenPackages.add(pkg);
                    }
                }
            } catch (Exception ignored) {}

        } catch (Exception e) {
            Log.e("LocalStream", "Error in getList", e);
        }

        JSObject response = new JSObject();
        response.put("players", playersArray);
        call.resolve(response);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les paramètres");
        }
    }

    @PluginMethod
    public void openVideo(PluginCall call) {
        String path = call.getString("path");
        String title = call.getString("title", "");
        long startPosition = call.getData().optLong("startPosition", 0L);
        String playerType = call.getString("playerType", "internal");
        String packageId = call.getString("packageId", "");

        if (path == null || path.isEmpty()) {
            call.reject("Chemin manquant");
            return;
        }

        Log.d("LocalStream", "Action: openVideo, path: " + path + ", startPosition: " + startPosition);

        try {
            if ("external".equals(playerType)) {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri videoUri;

                if (path.startsWith("content://") || path.startsWith("http://") || path.startsWith("https://")) {
                    videoUri = Uri.parse(path);
                } else {
                    String cleanPath = path;
                    if (cleanPath.startsWith("file://")) {
                        cleanPath = cleanPath.substring(7);
                    }
                    if (!cleanPath.startsWith("/")) {
                        cleanPath = "/storage/emulated/0/" + cleanPath;
                    }
                    java.io.File file = new java.io.File(cleanPath);
                    try {
                        videoUri = androidx.core.content.FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                    } catch (Exception e) {
                        Log.e("LocalStream", "Error getting FileProvider URI", e);
                        videoUri = Uri.fromFile(file);
                    }
                }

                intent.setDataAndType(videoUri, "video/*");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.setClipData(android.content.ClipData.newRawUri("", videoUri));

                if (packageId != null && !packageId.isEmpty()) {
                    intent.setPackage(packageId);
                    intent.addCategory(Intent.CATEGORY_DEFAULT);
                    intent.putExtra("title", title);
                    intent.putExtra("position", (int)startPosition);
                    intent.putExtra("extra_start_time", (int)startPosition);
                    intent.putExtra("return_result", true);
                }

                try {
                    getContext().startActivity(intent);
                    call.resolve();
                } catch (Exception e) {
                    if (packageId != null && !packageId.isEmpty()) {
                        intent.setPackage(null);
                        Intent chooser = Intent.createChooser(intent, "Ouvrir avec...");
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(chooser);
                        call.resolve();
                    } else {
                        throw e;
                    }
                }
            } else {
                String subtitlePath = call.getString("subtitlePath");
                Intent intent = new Intent(getContext(), PlayerActivity.class);
                intent.putExtra("VIDEO_PATH", path);
                intent.putExtra("VIDEO_TITLE", title);
                intent.putExtra("START_POSITION", (long)startPosition);
                if (subtitlePath != null && !subtitlePath.isEmpty()) {
                    intent.putExtra("SUBTITLE_PATH", subtitlePath);
                }
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(call, intent, "handleVideoResult");
            }
        } catch (Exception e) {
            Log.e("LocalStream", "Error opening video", e);
            call.reject("Erreur au lancement : " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestStoragePermission(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                intent.setData(uri);
                startActivityForResult(call, intent, "handlePermissionResult");
                return;
            }
        }
        
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkStoragePermission(PluginCall call) {
        boolean granted = true;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            granted = Environment.isExternalStorageManager();
        }
        
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void handlePermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        boolean granted = true;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            granted = Environment.isExternalStorageManager();
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void pickSubtitle(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        String[] mimetypes = {"application/x-subrip", "text/vtt", "text/plain", "application/octet-stream"};
        // Note: srt is often seen as octet-stream or plain text
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimetypes);
        
        startActivityForResult(call, intent, "handleSubtitlePickResult");
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void handleSubtitlePickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                // Return both the content URI and try to get the display name
                try {
                    final int takeFlags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
                } catch (SecurityException e) {
                    // Ignore if not supported by the provider
                }

                JSObject ret = new JSObject();
                ret.put("path", uri.toString());
                
                String name = "subtitle.srt";
                Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null);
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        name = cursor.getString(nameIndex);
                    }
                    cursor.close();
                }
                ret.put("name", name);
                call.resolve(ret);
                return;
            }
        }
        call.reject("Sélection annulée");
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void handleVideoResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        
        JSObject ret = new JSObject();
        if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            Intent data = result.getData();
            if (data != null) {
                ret.put("watched", data.getBooleanExtra("watched", false));
                ret.put("position", data.getLongExtra("position", 0L));
                ret.put("duration", data.getLongExtra("duration", 0L));
            }
        }
        call.resolve(ret);
    }
}
