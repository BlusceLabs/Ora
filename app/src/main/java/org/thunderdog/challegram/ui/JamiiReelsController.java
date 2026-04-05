/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Reels — short-form vertical video feed.
 */
package org.thunderdog.challegram.ui;

import android.content.Context;
import android.view.View;

import org.thunderdog.challegram.component.base.SettingView;
import org.thunderdog.challegram.v.CustomRecyclerView;

import org.thunderdog.challegram.R;
import org.thunderdog.challegram.core.Lang;
import org.thunderdog.challegram.telegram.Tdlib;

import java.util.ArrayList;


public class JamiiReelsController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiReelsController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_reels;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiReels);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiReelsTrending));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel1, R.drawable.baseline_videocam_24, R.string.JamiiReel1Title).setStringValue(Lang.getString(R.string.JamiiReel1Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel2, R.drawable.baseline_videocam_24, R.string.JamiiReel2Title).setStringValue(Lang.getString(R.string.JamiiReel2Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel3, R.drawable.baseline_videocam_24, R.string.JamiiReel3Title).setStringValue(Lang.getString(R.string.JamiiReel3Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel4, R.drawable.baseline_videocam_24, R.string.JamiiReel4Title).setStringValue(Lang.getString(R.string.JamiiReel4Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel5, R.drawable.baseline_videocam_24, R.string.JamiiReel5Title).setStringValue(Lang.getString(R.string.JamiiReel5Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiReelsForYou));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel6, R.drawable.baseline_videocam_24, R.string.JamiiReel6Title).setStringValue(Lang.getString(R.string.JamiiReel6Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_reel7, R.drawable.baseline_videocam_24, R.string.JamiiReel7Title).setStringValue(Lang.getString(R.string.JamiiReel7Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_reel, R.drawable.baseline_video_chat_24, R.string.JamiiCreateReel));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
    int id = v.getId();
    if (id == R.id.btn_jamii_create_reel) {
      navigateTo(new JamiiCreateController(context, tdlib));
    }
  }
}
