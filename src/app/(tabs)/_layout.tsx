import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';

import { FloatingTabBar, type TabMeta } from '@/components/floating-tab-bar';
import { t } from '@/lib/i18n';
import { takeReturnTo } from '@/lib/prefs';

export default function TabsLayout() {
  // After a language change remounts the app, go back to where the user was.
  useEffect(() => {
    const path = takeReturnTo();
    if (path) router.navigate(path as never);
  }, []);

  const tabs: Record<string, TabMeta> = {
    index: {
      label: t('File'),
      icon: { ios: 'folder', android: 'folder' },
      activeIcon: { ios: 'folder.fill', android: 'folder_open' },
    },
    tools: {
      label: t('Alat'),
      icon: { ios: 'wrench.and.screwdriver', android: 'handyman' },
      activeIcon: { ios: 'wrench.and.screwdriver.fill', android: 'handyman' },
    },
    settings: {
      label: t('Pengaturan'),
      icon: { ios: 'gearshape', android: 'settings' },
      activeIcon: { ios: 'gearshape.fill', android: 'settings' },
    },
  };

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} tabs={tabs} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tools" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
