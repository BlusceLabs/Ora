/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Create — full-featured post/reel/story/live creation flow.
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


public class JamiiCreateController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiCreateController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_create;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiCreatePost);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreateChooseType));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_text,   R.drawable.baseline_format_bold_24,  R.string.JamiiCreateTypeText));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_photo,  R.drawable.baseline_camera_alt_24, R.string.JamiiCreateTypePhoto));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_video,  R.drawable.baseline_videocam_24,     R.string.JamiiCreateTypeVideo));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_reel,   R.drawable.baseline_videocam_24,  R.string.JamiiCreateTypeReel));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_story,  R.drawable.baseline_book_24, R.string.JamiiCreateTypeStory));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_poll,   R.drawable.baseline_poll_24,         R.string.JamiiCreateTypePoll));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_go_live,       R.drawable.baseline_video_chat_24,      R.string.JamiiCreateTypeLive));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_space_host,    R.drawable.baseline_mic_24,          R.string.JamiiCreateTypeSpace));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreateOptions));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_create_audience,  R.drawable.baseline_group_24,    R.string.JamiiCreateAudience).setStringValue(Lang.getString(R.string.JamiiCreateAudiencePublic)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_create_schedule,  R.drawable.baseline_schedule_24, R.string.JamiiCreateSchedule).setStringValue(Lang.getString(R.string.JamiiCreateScheduleNow)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_create_location,  R.drawable.baseline_location_on_24, R.string.JamiiCreateLocation).setStringValue(Lang.getString(R.string.JamiiCreateLocationNone)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create_draft, R.drawable.baseline_archive_24, R.string.JamiiCreateSaveDraft));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
    int id = v.getId();
    if (id == R.id.btn_jamii_create_poll) {
      navigateTo(new CreatePollController(context, tdlib));
    } else if (id == R.id.btn_jamii_go_live) {
      navigateTo(new JamiiLiveController(context, tdlib));
    } else if (id == R.id.btn_jamii_space_host) {
      navigateTo(new JamiiSpacesController(context, tdlib));
    }
  }
}
