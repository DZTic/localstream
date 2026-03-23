package com.localstream.app;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.os.Bundle;
import android.util.Log;
import java.io.File;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VideoLauncher.class);
        super.onCreate(savedInstanceState);
        
        // Request MANAGE_EXTERNAL_STORAGE automatically on startup
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.addCategory("android.intent.category.DEFAULT");
                    intent.setData(Uri.parse(String.format("package:%s", getApplicationContext().getPackageName())));
                    startActivityForResult(intent, 2296);
                } catch (Exception e) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(intent, 2296);
                }
            }
        }
    }
}

@CapacitorPlugin(name = "VideoLauncher")
class VideoLauncher extends Plugin {
    @PluginMethod
    public void getList(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            JSONArray playersArray = new JSONArray();
            Log.d("LocalStream", "Scanning for video players...");
            
            // Method 1: Query Intent (Automatic)
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse("content://dummy.mp4"), "video/*");
            List<ResolveInfo> resInfo = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL);
            
            List<String> seenPackages = new ArrayList<>();
            Log.d("LocalStream", "Found " + resInfo.size() + " players via intent");
            for (ResolveInfo ri : resInfo) {
                String pkg = ri.activityInfo.packageName;
                if (!pkg.equals(getContext().getPackageName()) && !seenPackages.contains(pkg)) {
                    JSONObject player = new JSONObject();
                    player.put("name", ri.loadLabel(pm).toString());
                    player.put("packageId", pkg);
                    playersArray.put(player);
                    seenPackages.add(pkg);
                    Log.d("LocalStream", "Player found: " + ri.loadLabel(pm).toString() + " (" + pkg + ")");
                }
            }

            // Method 2: Manual Check for well-known players (Fallback)
            String[][] commonPlayers = {
                {"VLC", "org.videolan.vlc"},
                {"MX Player", "com.mxtech.videoplayer.ad"},
                {"MX Player Pro", "com.mxtech.videoplayer.pro"},
                {"Nova Player", "org.courville.nova"},
                {"Kodi", "org.xbmc.kodi"},
                {"KMPlayer", "com.kmplayer"},
                {"BSPlayer", "com.bsplayer.bspandroid.free"}
            };

            for (String[] config : commonPlayers) {
                String name = config[0];
                String pkg = config[1];
                if (!seenPackages.contains(pkg)) {
                    try {
                        pm.getPackageInfo(pkg, 0);
                        JSONObject player = new JSONObject();
                        player.put("name", name);
                        player.put("packageId", pkg);
                        playersArray.put(player);
                        seenPackages.add(pkg);
                        Log.d("LocalStream", "Manual check found: " + name + " (" + pkg + ")");
                    } catch (Exception ignored) {}
                }
            }
            
            Log.d("LocalStream", "Total players listed: " + playersArray.length());
            JSObject response = new JSObject();
            response.put("players", playersArray);
            call.resolve(response);
        } catch (Exception e) {
            Log.d("LocalStream", "Error in getList: " + e.getMessage());
            call.reject("Error listing players: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openVideo(PluginCall call) {
        String filePath = call.getString("path");
        String packageId = call.getString("packageId");

        if (filePath == null) {
            call.reject("Path is missing");
            return;
        }

        try {
            // Remove 'file://' prefix if present
            if (filePath.startsWith("file://")) {
                filePath = filePath.substring(7);
            }

            File file = new File(filePath);
            if (!file.exists()) {
                call.reject("File does not exist at path: " + filePath);
                return;
            }

            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "video/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (packageId != null && !packageId.isEmpty()) {
                intent.setPackage(packageId);
                getContext().startActivity(intent);
            } else {
                getContext().startActivity(Intent.createChooser(intent, "Ouvrir avec..."));
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Error opening video: " + e.getMessage());
        }
    }
}
