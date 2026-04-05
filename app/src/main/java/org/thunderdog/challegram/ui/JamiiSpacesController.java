/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Spaces — live audio rooms.
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


public class JamiiSpacesController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiSpacesController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_spaces;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiSpaces);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_space_host, R.drawable.baseline_mic_24, R.string.JamiiSpaceHost));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiSpacesLiveNow));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space1, R.drawable.baseline_music_note_24, R.string.JamiiSpace1Title).setStringValue(Lang.getString(R.string.JamiiSpace1Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space2, R.drawable.baseline_music_note_24, R.string.JamiiSpace2Title).setStringValue(Lang.getString(R.string.JamiiSpace2Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space3, R.drawable.baseline_music_note_24, R.string.JamiiSpace3Title).setStringValue(Lang.getString(R.string.JamiiSpace3Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space4, R.drawable.baseline_music_note_24, R.string.JamiiSpace4Title).setStringValue(Lang.getString(R.string.JamiiSpace4Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiSpacesScheduled));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space5, R.drawable.baseline_schedule_24, R.string.JamiiSpace5Title).setStringValue(Lang.getString(R.string.JamiiSpace5Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_space6, R.drawable.baseline_schedule_24, R.string.JamiiSpace6Title).setStringValue(Lang.getString(R.string.JamiiSpace6Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
