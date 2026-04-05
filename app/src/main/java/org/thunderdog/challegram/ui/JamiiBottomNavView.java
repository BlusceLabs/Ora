/*
 * This file is a part of Jamii
 * Copyright © 2024 BlusceLabs
 *
 * X-style bottom navigation bar — Home · Explore · Create · Notifications · Messages
 */
package org.thunderdog.challegram.ui;

import android.content.Context;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;

import org.thunderdog.challegram.BaseActivity;
import org.thunderdog.challegram.R;
import org.thunderdog.challegram.navigation.NavigationController;
import org.thunderdog.challegram.telegram.Tdlib;
import org.thunderdog.challegram.tool.Screen;
import org.thunderdog.challegram.tool.UI;

public class JamiiBottomNavView extends LinearLayout {

  public static final int HEIGHT_DP = 56;

  private static final int TAB_HOME    = 0;
  private static final int TAB_EXPLORE = 1;
  private static final int TAB_CREATE  = 2;
  private static final int TAB_NOTIFS  = 3;
  private static final int TAB_MSGS    = 4;

  private static final int COLOR_ACTIVE   = 0xFFE7E9EA;
  private static final int COLOR_INACTIVE = 0xFF71767B;
  private static final int COLOR_CREATE   = 0xFF2AABEE;
  private static final int COLOR_BORDER   = 0xFF2F3336;

  private final ImageView[] icons = new ImageView[5];
  private int activeTab = TAB_HOME;

  private static final int[] ICON_RES = {
    R.drawable.baseline_home_24,
    R.drawable.baseline_explore_24,
    R.drawable.baseline_add_24,
    R.drawable.baseline_notifications_24,
    R.drawable.baseline_chat_bubble_24,
  };

  public JamiiBottomNavView (Context context) {
    super(context);
    setOrientation(HORIZONTAL);
    setBackgroundColor(Color.BLACK);

    View topBorder = new View(context);
    topBorder.setBackgroundColor(COLOR_BORDER);
    LayoutParams borderParams = new LayoutParams(LayoutParams.MATCH_PARENT, Math.max(1, Screen.dp(0.5f)));
    borderParams.gravity = Gravity.TOP;
    addView(topBorder, borderParams);

    buildTabs(context);
  }

  private void buildTabs (Context context) {
    for (int i = 0; i < 5; i++) {
      final int tabIndex = i;

      LinearLayout cell = new LinearLayout(context);
      cell.setOrientation(VERTICAL);
      cell.setGravity(Gravity.CENTER);
      cell.setLayoutParams(new LayoutParams(0, LayoutParams.MATCH_PARENT, 1f));

      ImageView icon = new ImageView(context);
      icon.setImageResource(ICON_RES[i]);
      int iconDp = (i == TAB_CREATE) ? 30 : 26;
      icon.setLayoutParams(new LayoutParams(Screen.dp(iconDp), Screen.dp(iconDp)));
      icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
      applyIconColor(icon, i, i == activeTab);

      icons[i] = icon;
      cell.addView(icon);
      cell.setOnClickListener(v -> onTabClick(tabIndex));
      addView(cell);
    }
  }

  private void applyIconColor (ImageView icon, int tabIndex, boolean active) {
    int color;
    if (tabIndex == TAB_CREATE) {
      color = COLOR_CREATE;
    } else {
      color = active ? COLOR_ACTIVE : COLOR_INACTIVE;
    }
    icon.setColorFilter(color, android.graphics.PorterDuff.Mode.SRC_IN);
  }

  private void setActive (int tab) {
    activeTab = tab;
    for (int i = 0; i < icons.length; i++) {
      applyIconColor(icons[i], i, i == tab);
    }
  }

  private Tdlib getTdlib () {
    BaseActivity activity = UI.getUiContext();
    return activity != null ? activity.currentTdlib() : null;
  }

  private void onTabClick (int tab) {
    NavigationController nav = UI.getNavigation(getContext());
    Tdlib tdlib = getTdlib();
    if (nav == null || tdlib == null) return;

    switch (tab) {
      case TAB_HOME:
        setActive(TAB_HOME);
        nav.navigateTo(new JamiiFeedController(getContext(), tdlib));
        break;
      case TAB_EXPLORE:
        setActive(TAB_EXPLORE);
        nav.navigateTo(new JamiiSearchController(getContext(), tdlib));
        break;
      case TAB_CREATE:
        nav.navigateTo(new JamiiCreateController(getContext(), tdlib));
        break;
      case TAB_NOTIFS:
        setActive(TAB_NOTIFS);
        nav.navigateTo(new JamiiNotificationsController(getContext(), tdlib));
        break;
      case TAB_MSGS:
        setActive(TAB_MSGS);
        nav.setController(new MainController(getContext(), tdlib));
        break;
    }
  }
}
