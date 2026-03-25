package com.localstream.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.os.Environment;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.C;
import androidx.media3.common.MimeTypes;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.TrackSelectionDialogBuilder;
import android.provider.OpenableColumns;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import android.database.Cursor;
import android.view.MotionEvent;
import android.view.GestureDetector;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.LinearLayout;
import android.graphics.Color;
import java.util.Locale;

public class PlayerActivity extends Activity {

    private ExoPlayer player;
    private PlayerView playerView;
    private AudioManager audioManager;
    private int maxVolume;
    private float currentBrightness = -1f;
    private static final int PICK_SUBTITLE_REQUEST_CODE = 420;
    
    private LinearLayout gestureFeedbackLayout;
    private ImageView gestureFeedbackIcon;
    private ProgressBar gestureFeedbackProgress;
    private TextView gestureFeedbackText;
    private Handler feedbackHandler = new Handler(Looper.getMainLooper());
    private Runnable hideFeedbackRunnable = () -> {
        gestureFeedbackLayout.animate().alpha(0).setDuration(300).withEndAction(() -> {
            gestureFeedbackLayout.setVisibility(View.GONE);
        });
    };

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide status and navigation bars for true full screen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LOW_PROFILE |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        );

        setContentView(R.layout.activity_player);

        playerView = findViewById(R.id.player_view);
        gestureFeedbackLayout = findViewById(R.id.gesture_feedback_layout);
        gestureFeedbackIcon = findViewById(R.id.gesture_feedback_icon);
        gestureFeedbackProgress = findViewById(R.id.gesture_feedback_progress);
        gestureFeedbackText = findViewById(R.id.gesture_feedback_text);

        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);

        String videoPath = getIntent().getStringExtra("VIDEO_PATH");
        String videoTitle = getIntent().getStringExtra("VIDEO_TITLE");
        long startPosition = getIntent().getLongExtra("START_POSITION", 0);
        android.util.Log.d("LocalStream", "START_POSITION reçu : " + startPosition);
        if (startPosition > 0) {
            Toast.makeText(this, "Reprise à " + (startPosition / 1000) + "s", Toast.LENGTH_SHORT).show();
        }

        if (videoPath == null || videoPath.isEmpty()) {
            Toast.makeText(this, "Chemin vidéo manquant", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // Build ExoPlayer with all necessary capabilities
        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        playerView.setKeepScreenOn(true);
        
        // Configuration du titre dans le contrôleur si possible
        int titleId = getResources().getIdentifier("exo_title", "id", getPackageName());
        if (titleId == 0) titleId = getResources().getIdentifier("exo_title", "id", "androidx.media3.ui");
        if (titleId != 0) {
            TextView titleView = playerView.findViewById(titleId);
            if (titleView != null) {
                titleView.setText(videoTitle);
            }
        }

        Uri videoUri;
        android.util.Log.d("LocalStream", "VIDEO_PATH reçu : " + videoPath);

        if (videoPath.startsWith("content://") || videoPath.startsWith("http://") || videoPath.startsWith("https://")) {
            videoUri = Uri.parse(videoPath);
        } else if (videoPath.startsWith("file://")) {
            videoUri = Uri.parse(videoPath);
        } else {
            // Chemin absolu ou relatif — préfixer avec file://
            String actualPath = videoPath;
            if (!actualPath.startsWith("/")) {
                actualPath = Environment.getExternalStorageDirectory().getPath() + "/" + actualPath;
            }
            videoUri = Uri.parse("file://" + actualPath);
        }
        android.util.Log.d("LocalStream", "URI construite : " + videoUri.toString());

        MediaItem.Builder mediaItemBuilder = new MediaItem.Builder().setUri(videoUri);
        
        String subtitlePath = getIntent().getStringExtra("SUBTITLE_PATH");

        // Détection automatique si aucun sous-titre n'est passé explicitement
        if (subtitlePath == null || subtitlePath.isEmpty()) {
            String pathToCheck = null;
            if (videoPath.startsWith("/")) {
                pathToCheck = videoPath;
            } else if (videoPath.startsWith("file://")) {
                pathToCheck = videoPath.substring(7);
            } else if (!videoPath.startsWith("http") && !videoPath.startsWith("content://")) {
                pathToCheck = Environment.getExternalStorageDirectory().getPath() + "/" + videoPath;
            }

            if (pathToCheck != null) {
                java.io.File vFile = new java.io.File(pathToCheck);
                if (vFile.exists()) {
                    String folder = vFile.getParent();
                    String name = vFile.getName();
                    int dotIdx = name.lastIndexOf('.');
                    if (dotIdx > 0) {
                        String base = name.substring(0, dotIdx);
                        String[] exts = {".srt", ".vtt", ".ass", ".ssa", ".SRT", ".VTT"};
                        for (String ext : exts) {
                            java.io.File sFile = new java.io.File(folder, base + ext);
                            if (sFile.exists()) {
                                subtitlePath = sFile.getAbsolutePath();
                                android.util.Log.d("LocalStream", "Auto-détection: FB found " + subtitlePath);
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (subtitlePath != null && !subtitlePath.isEmpty()) {
            Uri subtitleUri;
            if (subtitlePath.startsWith("content://") || subtitlePath.startsWith("http://") || subtitlePath.startsWith("https://") || subtitlePath.startsWith("file://")) {
                subtitleUri = Uri.parse(subtitlePath);
            } else {
                String actualSubPath = subtitlePath;
                if (!actualSubPath.startsWith("/")) {
                    actualSubPath = Environment.getExternalStorageDirectory().getPath() + "/" + actualSubPath;
                }
                subtitleUri = Uri.parse("file://" + actualSubPath);
            }
            
            String mimeType = MimeTypes.APPLICATION_SUBRIP; // Default for SRT
            if (subtitlePath.toLowerCase().endsWith(".vtt")) {
                mimeType = MimeTypes.TEXT_VTT;
            } else if (subtitlePath.toLowerCase().endsWith(".ass") || subtitlePath.toLowerCase().endsWith(".ssa")) {
                mimeType = MimeTypes.TEXT_SSA;
            }

            MediaItem.SubtitleConfiguration subtitleConfig = new MediaItem.SubtitleConfiguration.Builder(subtitleUri)
                .setMimeType(mimeType)
                .setLanguage("fr")
                .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                .setRoleFlags(C.ROLE_FLAG_SUBTITLE)
                .setLabel("Français (Local)")
                .build();
            
            java.util.List<MediaItem.SubtitleConfiguration> subs = new java.util.ArrayList<>();
            subs.add(subtitleConfig);
            mediaItemBuilder.setSubtitleConfigurations(subs);
        }

        MediaItem mediaItem = mediaItemBuilder.build();
        player.setMediaItem(mediaItem);
        if (startPosition > 0) {
            player.seekTo(startPosition);
        }
        player.prepare();

        player.setPlayWhenReady(true);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Toast.makeText(PlayerActivity.this,
                    "Erreur de lecture : " + error.getMessage(),
                    Toast.LENGTH_LONG).show();
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    Intent resultIntent = new Intent();
                    resultIntent.putExtra("watched", true);
                    setResult(RESULT_OK, resultIntent);
                    finish();
                }
            }
        });

        // Configurer les boutons du contrôleur (Settings, etc.)
        int settingsId = getResources().getIdentifier("exo_settings", "id", getPackageName());
        if (settingsId == 0) settingsId = getResources().getIdentifier("exo_settings", "id", "androidx.media3.ui");
        if (settingsId != 0) {
            View settingsBtn = playerView.findViewById(settingsId);
            if (settingsBtn != null) {
                settingsBtn.setOnClickListener(v -> showSettingsDialog());
            }
        }

        // Bouton CC (Sous-titres direct)
        int ccId = getResources().getIdentifier("exo_subtitle", "id", getPackageName());
        if (ccId == 0) ccId = getResources().getIdentifier("exo_subtitle", "id", "androidx.media3.ui");
        if (ccId != 0) {
            View ccBtn = playerView.findViewById(ccId);
            if (ccBtn != null) {
                ccBtn.setOnClickListener(v -> showTrackDialog(androidx.media3.common.C.TRACK_TYPE_TEXT, "Sous-titres"));
                ccBtn.setVisibility(View.VISIBLE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_SUBTITLE_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            Uri subtitleUri = data.getData();
            if (subtitleUri != null) {
                try {
                    // Octroyer une permission persistante pour le fichier choisi
                    final int takeFlags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getContentResolver().takePersistableUriPermission(subtitleUri, takeFlags);
                } catch (Exception e) {
                    android.util.Log.e("LocalStream", "Erreur takePersistableUriPermission", e);
                }
                addExternalSubtitle(subtitleUri);
            }
        }
    }

    private void addExternalSubtitle(Uri subtitleUri) {
        if (player == null) return;
        
        MediaItem currentItem = player.getCurrentMediaItem();
        if (currentItem == null) return;

        String path = subtitleUri.toString();
        // Récupérer le nom du fichier pour le label
        String fileName = "Sous-titre Manuel";
        Cursor cursor = getContentResolver().query(subtitleUri, null, null, null, null);
        if (cursor != null && cursor.moveToFirst()) {
            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            if (nameIndex != -1) fileName = cursor.getString(nameIndex);
            cursor.close();
        }

        String mimeType = MimeTypes.APPLICATION_SUBRIP;
        if (fileName.toLowerCase().endsWith(".vtt")) {
            mimeType = MimeTypes.TEXT_VTT;
        } else if (fileName.toLowerCase().endsWith(".ass") || fileName.toLowerCase().endsWith(".ssa")) {
            mimeType = MimeTypes.TEXT_SSA;
        }

        MediaItem.SubtitleConfiguration subtitleConfig = new MediaItem.SubtitleConfiguration.Builder(subtitleUri)
            .setMimeType(mimeType)
            .setLanguage("fr")
            .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
            .setRoleFlags(C.ROLE_FLAG_SUBTITLE)
            .setLabel(fileName)
            .build();

        List<MediaItem.SubtitleConfiguration> currentSubs = new ArrayList<>();
        if (currentItem.localConfiguration != null && currentItem.localConfiguration.subtitleConfigurations != null) {
            currentSubs.addAll(currentItem.localConfiguration.subtitleConfigurations);
        }
        currentSubs.add(subtitleConfig);

        MediaItem newMediaItem = currentItem.buildUpon()
            .setSubtitleConfigurations(currentSubs)
            .build();

        long position = player.getCurrentPosition();
        boolean playWhenReady = player.getPlayWhenReady();
        player.setMediaItem(newMediaItem, false);
        // Important pour charger les nouveaux flux de texte
        player.prepare();
        player.seekTo(position);
        player.setPlayWhenReady(playWhenReady);
        
        Toast.makeText(this, "Sous-titre '" + fileName + "' ajouté.", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void finish() {
        if (player != null) {
            long position = player.getCurrentPosition();
            long duration = player.getDuration();
            Intent resultIntent = new Intent();
            if (duration > 0 && (float)position / duration > 0.95f) {
                resultIntent.putExtra("watched", true);
                resultIntent.putExtra("position", 0L);
            } else {
                resultIntent.putExtra("watched", false);
                resultIntent.putExtra("position", position);
            }
            resultIntent.putExtra("duration", duration);
            setResult(RESULT_OK, resultIntent);
        }
        super.finish();
    }

    private void showSettingsDialog() {
        String[] options = {"Vitesse de lecture", "Pistes Audio", "Sous-titres", "Dimension de l'écran", "Ajouter un fichier de sous-titres (.srt, .vtt)"};
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this, R.style.CustomDialogTheme);
        builder.setTitle("Options du lecteur");
        builder.setItems(options, (dialog, which) -> {
            switch (which) {
                case 0: // Vitesse
                    showSpeedDialog();
                    break;
                case 1: // Audio
                    showTrackDialog(androidx.media3.common.C.TRACK_TYPE_AUDIO, "Pistes Audio");
                    break;
                case 2: // Sous-titres
                    showTrackDialog(androidx.media3.common.C.TRACK_TYPE_TEXT, "Sous-titres");
                    break;
                case 3: // Resize
                    showResizeDialog();
                    break;
                case 4: // Ajout manuel
                    pickLocalSubtitle();
                    break;
            }
        });
        builder.show();
    }

    private void pickLocalSubtitle() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        String[] mimetypes = {"application/x-subrip", "text/vtt", "text/plain", "application/octet-stream"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimetypes);
        startActivityForResult(intent, PICK_SUBTITLE_REQUEST_CODE);
    }

    private void showSpeedDialog() {
        String[] speeds = {"0.5x", "0.75x", "Normale", "1.25x", "1.5x", "2.0x"};
        float[] values = {0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f};
        
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this, R.style.CustomDialogTheme);
        builder.setTitle("Vitesse de lecture");
        builder.setItems(speeds, (dialog, which) -> {
            androidx.media3.common.PlaybackParameters params = new androidx.media3.common.PlaybackParameters(values[which]);
            player.setPlaybackParameters(params);
        });
        builder.show();
    }

    private void showTrackDialog(int trackType, String title) {
        new androidx.media3.ui.TrackSelectionDialogBuilder(this, title, player, trackType)
            .setTheme(R.style.CustomDialogTheme)
            .build()
            .show();
    }

    private void showResizeDialog() {
        String[] modes = {"Adapter (Fit)", "Remplir (Fill)", "Zoomer", "Original"};
        int[] values = {
            androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT,
            androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FILL,
            androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM,
            androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT // Default fallback
        };
        
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this, R.style.CustomDialogTheme);
        builder.setTitle("Dimension de l'écran");
        builder.setItems(modes, (dialog, which) -> {
            playerView.setResizeMode(values[which]);
        });
        builder.show();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (player != null) {
            // Save position before stopping
            savePosition();
        }
    }

    private void savePosition() {
        if (player != null) {
            Intent result = new Intent();
            result.putExtra("WATCH_POSITION", player.getCurrentPosition());
            result.putExtra("WATCH_DURATION", player.getDuration());
            setResult(RESULT_OK, result);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }

    @Override
    public void onBackPressed() {
        savePosition();
        super.onBackPressed();
    }

    private float startY = 0f;
    private float startX = 0f;
    private float baseVal = 0f;
    private boolean isGesturing = false;

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        switch (ev.getAction()) {
            case MotionEvent.ACTION_DOWN:
                startX = ev.getX();
                startY = ev.getY();
                isGesturing = false;
                if (startX < getScreenWidth() / 3) {
                    baseVal = getWindowBrightness();
                } else if (startX > (getScreenWidth() * 2 / 3)) {
                    baseVal = (float) audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) / maxVolume;
                }
                break;
            case MotionEvent.ACTION_MOVE:
                float deltaY = startY - ev.getY();
                float deltaX = ev.getX() - startX;
                if (!isGesturing && Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
                    isGesturing = true;
                }
                if (isGesturing) {
                    float percentDelta = deltaY / (getScreenHeight() / 1.5f);
                    float newVal = Math.max(0, Math.min(1, baseVal + percentDelta));
                    if (startX < getScreenWidth() / 3) {
                        setWindowBrightness(newVal);
                        showFeedback(true, (int)(newVal * 100));
                    } else if (startX > (getScreenWidth() * 2 / 3)) {
                        int vol = (int)(newVal * maxVolume);
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, vol, 0);
                        showFeedback(false, (int)(newVal * 100));
                    }
                    return true;
                }
                break;
            case MotionEvent.ACTION_UP:
                if (isGesturing) {
                    feedbackHandler.postDelayed(hideFeedbackRunnable, 1000);
                    return true;
                }
                break;
        }
        return super.dispatchTouchEvent(ev);
    }

    private int getScreenWidth() { return getResources().getDisplayMetrics().widthPixels; }
    private int getScreenHeight() { return getResources().getDisplayMetrics().heightPixels; }

    private float getWindowBrightness() {
        float brightness = getWindow().getAttributes().screenBrightness;
        if (brightness < 0) return 0.5f;
        return brightness;
    }

    private void setWindowBrightness(float brightness) {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = brightness;
        getWindow().setAttributes(lp);
        currentBrightness = brightness;
    }

    private void showFeedback(boolean isBrightness, int percent) {
        feedbackHandler.removeCallbacks(hideFeedbackRunnable);
        gestureFeedbackLayout.setVisibility(View.VISIBLE);
        gestureFeedbackLayout.setAlpha(1f);
        if (isBrightness) {
            gestureFeedbackIcon.setImageResource(android.R.drawable.ic_menu_compass);
            gestureFeedbackText.setText(String.format(Locale.FRANCE, "Luminosité : %d%%", percent));
        } else {
            gestureFeedbackIcon.setImageResource(android.R.drawable.ic_lock_silent_mode_off);
            gestureFeedbackText.setText(String.format(Locale.FRANCE, "Volume : %d%%", percent));
        }
        gestureFeedbackProgress.setProgress(percent);
    }
}
