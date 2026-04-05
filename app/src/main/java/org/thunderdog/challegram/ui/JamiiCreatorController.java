/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Creator Studio — analytics, monetization and content tools.
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


public class JamiiCreatorController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiCreatorController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_creator;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiCreatorStudio);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreatorOverview));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_group_24,      R.string.JamiiCreatorFollowers).setStringValue(Lang.getString(R.string.JamiiCreatorFollowersValue)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_visibility_24,  R.string.JamiiCreatorViews).setStringValue(Lang.getString(R.string.JamiiCreatorViewsValue)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_favorite_24,    R.string.JamiiCreatorLikes).setStringValue(Lang.getString(R.string.JamiiCreatorLikesValue)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_premium_star_24, R.string.JamiiCreatorEarnings).setStringValue(Lang.getString(R.string.JamiiCreatorEarningsValue)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreatorContent));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_posts,     R.drawable.baseline_assignment_24,         R.string.JamiiCreatorMyPosts));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_reels,     R.drawable.baseline_videocam_24,     R.string.JamiiCreatorMyReels));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_drafts,    R.drawable.baseline_archive_24,          R.string.JamiiCreatorDrafts));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_scheduled, R.drawable.baseline_schedule_24,        R.string.JamiiCreatorScheduled));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreatorMonetize));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_subscriptions, R.drawable.baseline_star_24,         R.string.JamiiCreatorSubscriptions));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_gifts,         R.drawable.baseline_party_popper_24, R.string.JamiiCreatorGifts));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_affiliate,     R.drawable.baseline_link_24,          R.string.JamiiCreatorAffiliate));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_tips,          R.drawable.baseline_account_balance_wallet_24,  R.string.JamiiCreatorTips));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreatorTools));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_analytics,  R.drawable.baseline_bar_chart_24,     R.string.JamiiCreatorAnalytics));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_audience,   R.drawable.baseline_group_24,        R.string.JamiiCreatorAudience));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator_collab,     R.drawable.baseline_work_24,     R.string.JamiiCreatorCollabs));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
    int id = v.getId();
    if (id == R.id.btn_jamii_creator_posts || id == R.id.btn_jamii_creator_reels
      || id == R.id.btn_jamii_creator_drafts || id == R.id.btn_jamii_creator_scheduled) {
      navigateTo(new JamiiFeedController(context, tdlib));
    }
  }
}
