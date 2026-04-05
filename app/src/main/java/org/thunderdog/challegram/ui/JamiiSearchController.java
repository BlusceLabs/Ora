/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Explore / Search — trending topics, people, and content.
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

public class JamiiSearchController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiSearchController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_search;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiExplore);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiTrendingNow));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_trending1, R.drawable.baseline_whatshot_24, R.string.JamiiTrending1));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_trending2, R.drawable.baseline_whatshot_24, R.string.JamiiTrending2));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_trending3, R.drawable.baseline_whatshot_24, R.string.JamiiTrending3));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_trending4, R.drawable.baseline_whatshot_24, R.string.JamiiTrending4));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_trending5, R.drawable.baseline_whatshot_24, R.string.JamiiTrending5));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiPeopleToFollow));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_follow1, R.drawable.baseline_group_24, R.string.JamiiSuggestedUser1));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_follow2, R.drawable.baseline_group_24, R.string.JamiiSuggestedUser2));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_follow3, R.drawable.baseline_group_24, R.string.JamiiSuggestedUser3));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
