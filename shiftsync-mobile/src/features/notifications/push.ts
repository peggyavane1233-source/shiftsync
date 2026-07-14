import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any), // Type assertion to bypass strict expo version typing issues
});

export async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'critical',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#FF0000',
      bypassDnd: true, // For fatigue critical and muster
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return;
  }
  try {
    // Try to get actual Expo Push Token
    const projectId = 'your-expo-project-id'; // Normally from Constants.expoConfig?.extra?.eas?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Expo push token registered:", token);
  } catch (e) {
    console.warn('Failed to fetch real push token, falling back to mock', e);
    token = 'mock-push-token-dev';
  }

  return token;
}

export function setupNotificationListeners() {
  // Foreground listener
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Received notification in foreground:', notification);
  });

  // Tap listener
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('User tapped notification:', response);
    const data = response.notification.request.content.data;
    
    // Deep linking logic
    if (data?.linkTo) {
      router.push(data.linkTo as any);
    } else if (data?.type === 'SHIFT_CHANGE') {
      router.push('/(worker)/notifications');
    } else if (data?.type === 'FATIGUE') {
      router.push('/(worker)/fatigue');
    }
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
