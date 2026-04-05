/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Jamii Super-App Hub — entry point for all Jamii social features.
 */
package org.thunderdog.challegram.ui;

import android.content.Context;
import android.view.View;

import org.thunderdog.challegram.component.base.SettingView;
import org.thunderdog.challegram.v.CustomRecyclerView;

import org.thunderdog.challegram.R;
import org.thunderdog.challegram.core.Lang;
import org.thunderdog.challegram.navigation.ViewController;
import org.thunderdog.challegram.telegram.Tdlib;
import org.thunderdog.challegram.theme.ColorId;
import org.thunderdog.challegram.tool.UI;

import java.util.ArrayList;


public class JamiiHubController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiHubController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_hub;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiHub);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {
        view.setDrawModifier(null);
      }
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiSocialFeatures));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_feed,     R.drawable.baseline_home_24,        R.string.JamiiFeed));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_reels,    R.drawable.baseline_videocam_24, R.string.JamiiReels));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_stories,  R.drawable.baseline_book_24, R.string.JamiiStories));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_live,     R.drawable.baseline_video_chat_24,     R.string.JamiiLive));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_spaces,   R.drawable.baseline_mic_24,         R.string.JamiiSpaces));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreateAndShare));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_create,       R.drawable.baseline_add_24,    R.string.JamiiCreatePost));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_communities,  R.drawable.baseline_group_24,         R.string.JamiiCommunities));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_bookmarks,    R.drawable.baseline_bookmark_24,      R.string.JamiiBookmarks));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiCreatorAndCommerce));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_creator, R.drawable.baseline_star_24,          R.string.JamiiCreatorStudio));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_shop,    R.drawable.baseline_assignment_24,  R.string.JamiiShop));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_wallet,        R.drawable.baseline_account_balance_wallet_24, R.string.JamiiWallet));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
    int id = v.getId();
    if (id == R.id.btn_jamii_feed) {
      navigateTo(new JamiiFeedController(context, tdlib));
    } else if (id == R.id.btn_jamii_reels) {
      navigateTo(new JamiiReelsController(context, tdlib));
    } else if (id == R.id.btn_jamii_stories) {
      navigateTo(new JamiiStoriesController(context, tdlib));
    } else if (id == R.id.btn_jamii_live) {
      navigateTo(new JamiiLiveController(context, tdlib));
    } else if (id == R.id.btn_jamii_spaces) {
      navigateTo(new JamiiSpacesController(context, tdlib));
    } else if (id == R.id.btn_jamii_create) {
      navigateTo(new JamiiCreateController(context, tdlib));
    } else if (id == R.id.btn_jamii_communities) {
      navigateTo(new JamiiCommunitiesController(context, tdlib));
    } else if (id == R.id.btn_jamii_bookmarks) {
      navigateTo(new JamiiBookmarksController(context, tdlib));
    } else if (id == R.id.btn_jamii_creator) {
      navigateTo(new JamiiCreatorController(context, tdlib));
    } else if (id == R.id.btn_jamii_shop) {
      navigateTo(new JamiiShopController(context, tdlib));
    } else if (id == R.id.btn_wallet) {
      navigateTo(new JamiiWalletController(context, tdlib));
    }
  }
}
