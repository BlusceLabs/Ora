/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * Wallet — Jamii Coins, gifts, creator earnings and transactions.
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


public class JamiiWalletController extends RecyclerViewController<Void> implements View.OnClickListener {

  private SettingsAdapter adapter;

  public JamiiWalletController (Context context, Tdlib tdlib) {
    super(context, tdlib);
  }

  @Override
  public int getId () {
    return R.id.controller_jamii_wallet;
  }

  @Override
  public CharSequence getName () {
    return Lang.getString(R.string.JamiiWallet);
  }

  @Override
  protected void onCreateView (Context context, CustomRecyclerView recyclerView) {
    adapter = new SettingsAdapter(this) {
      @Override
      protected void setValuedSetting (ListItem item, SettingView view, boolean isUpdate) {}
    };

    ArrayList<ListItem> items = new ArrayList<>();

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiWalletBalance));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_premium_star_24, R.string.JamiiWalletCoins).setStringValue(Lang.getString(R.string.JamiiWalletCoinsValue)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_premium_star_24,         R.string.JamiiWalletDiamonds).setStringValue(Lang.getString(R.string.JamiiWalletDiamondsValue)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_account_balance_wallet_24, R.string.JamiiWalletEarnings).setStringValue(Lang.getString(R.string.JamiiWalletEarningsValue)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_wallet_buy,      R.drawable.baseline_add_24,   R.string.JamiiWalletBuyCoins));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_wallet_send,     R.drawable.baseline_send_24,       R.string.JamiiWalletSendGift));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_SETTING, R.id.btn_jamii_wallet_withdraw, R.drawable.baseline_account_balance_wallet_24,   R.string.JamiiWalletWithdraw));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiWalletTransactions));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_premium_star_24, R.string.JamiiTx1Desc).setStringValue(Lang.getString(R.string.JamiiTx1Amount)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_party_popper_24,   R.string.JamiiTx2Desc).setStringValue(Lang.getString(R.string.JamiiTx2Amount)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_account_balance_wallet_24,        R.string.JamiiTx3Desc).setStringValue(Lang.getString(R.string.JamiiTx3Amount)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_assignment_24,    R.string.JamiiTx4Desc).setStringValue(Lang.getString(R.string.JamiiTx4Amount)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    items.add(new ListItem(ListItem.TYPE_HEADER, 0, 0, R.string.JamiiWalletSubscriptions));

    items.add(new ListItem(ListItem.TYPE_SHADOW_TOP));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_star_24,   R.string.JamiiSub1Name).setStringValue(Lang.getString(R.string.JamiiSub1Price)));
    items.add(new ListItem(ListItem.TYPE_SEPARATOR));
    items.add(new ListItem(ListItem.TYPE_VALUED_SETTING_COMPACT, 0, R.drawable.baseline_check_circle_24, R.string.JamiiSub2Name).setStringValue(Lang.getString(R.string.JamiiSub2Price)));
    items.add(new ListItem(ListItem.TYPE_SHADOW_BOTTOM));

    adapter.setItems(items, false);
    recyclerView.setAdapter(adapter);
  }

  @Override
  public void onClick (View v) {
  }
}
