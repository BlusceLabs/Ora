/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Shop — in-app shopping, product listings and commerce.
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


public class JamiiShopController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiShopController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_shop;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiShop);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_shop_cart,     R.drawable.baseline_assignment_24,  R.string.JamiiShopCart));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_shop_wishlist, R.drawable.baseline_favorite_24,       R.string.JamiiShopWishlist));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_shop_orders,   R.drawable.baseline_share_24, R.string.JamiiShopOrders));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiShopCategories));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_device_android_24,  R.string.JamiiShopCatElectronics));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_work_24,      R.string.JamiiShopCatFashion));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_home_24,           R.string.JamiiShopCatHome));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_sports_soccer_24, R.string.JamiiShopCatSports));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_book_24,           R.string.JamiiShopCatBooks));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, 0, R.drawable.baseline_restaurant_menu_24, R.string.JamiiShopCatGrocery));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiShopFeatured));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_product1, R.drawable.baseline_assignment_24, R.string.JamiiProduct1Name).setStringValue(Lang.getString(R.string.JamiiProduct1Price)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_product2, R.drawable.baseline_assignment_24, R.string.JamiiProduct2Name).setStringValue(Lang.getString(R.string.JamiiProduct2Price)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_product3, R.drawable.baseline_assignment_24, R.string.JamiiProduct3Name).setStringValue(Lang.getString(R.string.JamiiProduct3Price)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, R.id.btn_jamii_product4, R.drawable.baseline_assignment_24, R.string.JamiiProduct4Name).setStringValue(Lang.getString(R.string.JamiiProduct4Price)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_shop_sell, R.drawable.baseline_work_24, R.string.JamiiShopSell));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
