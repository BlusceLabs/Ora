/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Bookmarks — saved posts, videos, quotes and products organized into collections.
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


public class JamiiBookmarksController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiBookmarksController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_bookmarks;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiBookmarks);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_bookmark_new_collection, R.drawable.baseline_create_new_folder_24, R.string.JamiiBookmarkNewCollection));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiBookmarkCollections));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_all,      R.drawable.baseline_bookmark_24,          R.string.JamiiBookmarkAll).setStringValue("47"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_videos,   R.drawable.baseline_videocam_24,       R.string.JamiiBookmarkVideos).setStringValue("12"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_photos,   R.drawable.baseline_camera_alt_24,      R.string.JamiiBookmarkPhotos).setStringValue("18"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_quotes,   R.drawable.baseline_format_quote_close_24,      R.string.JamiiBookmarkQuotes).setStringValue("9"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_articles, R.drawable.baseline_assignment_24,           R.string.JamiiBookmarkArticles).setStringValue("5"));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_bookmark_products, R.drawable.baseline_assignment_24,      R.string.JamiiBookmarkProducts).setStringValue("3"));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
