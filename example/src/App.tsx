import { View, StyleSheet, Button, Alert, Text, TextInput } from 'react-native';
import {
  getPassword,
  googleSignIn,
  passwordSignIn,
  appleSignIn,
  GOOGLE_ID_SUPPORTED,
  PASSWORD_SUPPORTED,
  APPLE_ID_SUPPORTED,
} from 'react-native-oauth-essentials';
import { useState } from 'react';

console.log({ GOOGLE_ID_SUPPORTED, PASSWORD_SUPPORTED, APPLE_ID_SUPPORTED });

// Replace with your own OAuth Android Client ID for Android on page: https://console.cloud.google.com/auth/clients
const OAUTH_ANDROID_GOOGLE =
  '277568390005-ohmjdo2hph2aokcha0q7po720iceci6h.apps.googleusercontent.com';

export default function App() {
  const [signInMenu, setSignInMenu] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function onGoogleSignInPress() {
    try {
      const result = await googleSignIn(OAUTH_ANDROID_GOOGLE);
      console.log('success', result);
    } catch (err) {
      Alert.alert('error', (err as Error).message);
    }
  }

  async function onAppleSignInPress() {
    try {
      const result = await appleSignIn();
      console.log('success', result);
    } catch (err) {
      Alert.alert('error', (err as Error).message);
    }
  }

  async function onPasswordSignInPress() {
    try {
      let result = await getPassword();
      if (result) {
        console.log('success', result);
        setSignInMenu(false);
      } else {
        if (!signInMenu) {
          setSignInMenu(true);
        } else {
          if (!result) {
            await passwordSignIn(username, password);
            result = await getPassword();
            if (!result) {
              throw new Error('Could not save the credentials on the OS.');
            }
            setSignInMenu(false);
            console.log('success', 'saved password successfully');
          }
        }
      }
    } catch (err) {
      Alert.alert('error', (err as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      {signInMenu ? (
        <>
          <TextInput
            onChangeText={(text) => setUsername(text)}
            placeholder="Username"
            style={styles.input}
          />
          <TextInput
            onChangeText={(text) => setPassword(text)}
            placeholder="Password"
            style={styles.input}
          />
          <Button title="Go back" onPress={() => setSignInMenu(false)} />
          <Button title="Sign in!" onPress={onPasswordSignInPress} />
        </>
      ) : (
        <>
          <Text>Open up console to see results!</Text>
          <Button title="Google OAuth Sign-In" onPress={onGoogleSignInPress} />
          <Button title="Apple Sign-In" onPress={onAppleSignInPress} />
          <Button title="Password Sign-In" onPress={onPasswordSignInPress} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  input: {
    minWidth: 200,
  },
});
