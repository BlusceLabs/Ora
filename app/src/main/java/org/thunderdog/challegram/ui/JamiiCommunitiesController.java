/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Communities — topic-based groups and discussions.
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


public class JamiiCommunitiesController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiCommunitiesController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_communities;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiCommunities);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_community_create, R.drawable.baseline_add_24, R.string.JamiiCommunityCreate));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_community_discover, R.drawable.baseline_explore_24, R.string.JamiiCommunityDiscover));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiMyCommunities));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm1, R.drawable.baseline_group_24, R.string.JamiiCommunity1Name).setStringValue(Lang.getString(R.string.JamiiCommunity1Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm2, R.drawable.baseline_group_24, R.string.JamiiCommunity2Name).setStringValue(Lang.getString(R.string.JamiiCommunity2Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm3, R.drawable.baseline_group_24, R.string.JamiiCommunity3Name).setStringValue(Lang.getString(R.string.JamiiCommunity3Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiSuggestedCommunities));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm4, R.drawable.baseline_group_24, R.string.JamiiCommunity4Name).setStringValue(Lang.getString(R.string.JamiiCommunity4Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm5, R.drawable.baseline_group_24, R.string.JamiiCommunity5Name).setStringValue(Lang.getString(R.string.JamiiCommunity5Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm6, R.drawable.baseline_group_24, R.string.JamiiCommunity6Name).setStringValue(Lang.getString(R.string.JamiiCommunity6Meta)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_comm7, R.drawable.baseline_group_24, R.string.JamiiCommunity7Name).setStringValue(Lang.getString(R.string.JamiiCommunity7Meta)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
