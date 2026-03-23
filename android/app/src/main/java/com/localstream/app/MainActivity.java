package com.localstream.app;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.os.Bundle;
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

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
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
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse("file:///dummy.mp4"), "video/*");
            
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> resInfo = pm.queryIntentActivities(intent, 0);
            
            List<JSObject> players = new ArrayList<>();
            for (ResolveInfo ri : resInfo) {
                JSObject player = new JSObject();
                player.put("name", ri.loadLabel(pm).toString());
                player.put("packageId", ri.activityInfo.packageName);
                players.add(player);
            }
            
            JSObject response = new JSObject();
            response.put("players", players);
            call.resolve(response);
        } catch (Exception e) {
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
