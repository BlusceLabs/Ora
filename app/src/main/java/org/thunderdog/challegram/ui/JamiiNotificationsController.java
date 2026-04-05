/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Notifications — activity, mentions, likes, reposts, follows.
 */
package org.thunderdog.challegram.ui;

import android.content.Context;
import android.view.View;

import org.thunderdog.challegram.R;
import org.thunderdog.challegram.component.base.SettingView;
import org.thunderdog.challegram.core.Lang;
import org.thunderdog.challegram.telegram.Tdlib;
import org.thunderdog.challegram.v.CustomRecyclerView;

import java.util.ArrayList;

public class JamiiNotificationsController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiNotificationsController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_notifications;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiNotifications);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiNotifAll));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_INFO_MULTILINE, R.id.btn_jamii_notif1, R.drawable.baseline_favorite_24, R.string.JamiiNotifLike1).setStringValue("@bluscelabs · 2m"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_INFO_MULTILINE, R.id.btn_jamii_notif2, R.drawable.baseline_group_24, R.string.JamiiNotifFollow1).setStringValue("@amara_w · 5m"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_INFO_MULTILINE, R.id.btn_jamii_notif3, R.drawable.baseline_share_24, R.string.JamiiNotifRepost1).setStringValue("@kevindev · 12m"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_INFO_MULTILINE, R.id.btn_jamii_notif4, R.drawable.baseline_format_quote_close_24, R.string.JamiiNotifMention1).setStringValue("@djmaina · 1h"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_INFO_MULTILINE, R.id.btn_jamii_notif5, R.drawable.baseline_favorite_24, R.string.JamiiNotifLike2).setStringValue("@ninapatel · 2h"));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
