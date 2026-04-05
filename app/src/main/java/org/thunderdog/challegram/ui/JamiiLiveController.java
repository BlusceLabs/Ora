/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Live — live video broadcasting and discovery.
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


public class JamiiLiveController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiLiveController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_live;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiLive);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_go_live,  R.drawable.baseline_video_chat_24,    R.string.JamiiGoLive));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_live_schedule, R.drawable.baseline_schedule_24, R.string.JamiiScheduleLive));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiLiveNow));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_live1, R.drawable.baseline_video_chat_24, R.string.JamiiLiveStream1Title).setStringValue(Lang.getString(R.string.JamiiLiveStream1Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_live2, R.drawable.baseline_video_chat_24, R.string.JamiiLiveStream2Title).setStringValue(Lang.getString(R.string.JamiiLiveStream2Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_live3, R.drawable.baseline_video_chat_24, R.string.JamiiLiveStream3Title).setStringValue(Lang.getString(R.string.JamiiLiveStream3Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_live4, R.drawable.baseline_video_chat_24, R.string.JamiiLiveStream4Title).setStringValue(Lang.getString(R.string.JamiiLiveStream4Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiLiveCategories));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_music_note_24, R.string.JamiiLiveCatMusic));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_sports_esports_24, R.string.JamiiLiveCatGaming));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_school_24, R.string.JamiiLiveCatEducation));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_assignment_24, R.string.JamiiLiveCatShopping));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_sports_soccer_24, R.string.JamiiLiveCatSports));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
