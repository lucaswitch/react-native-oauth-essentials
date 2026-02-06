import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from './Button';
import {
  APPLE_ID_SUPPORTED,
  appleSignIn,
  getPassword,
  GOOGLE_ID_SUPPORTED,
  googleSignIn,
  HYBRID_SUPPORTED,
  hybridSignIn,
  PASSWORD_SUPPORTED,
  passwordSignIn,
} from 'react-native-oauth-essentials';
import { useEffect, useState } from 'react';

console.log('PLATFORM AVAILABILITY', {
  GOOGLE_ID_SUPPORTED,
  PASSWORD_SUPPORTED,
  APPLE_ID_SUPPORTED,
  HYBRID_SUPPORTED,
});

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

  useEffect(() => {
    if (HYBRID_SUPPORTED)
      hybridSignIn(OAUTH_ANDROID_GOOGLE)
        .then((result) => console.log('success', result))
        .catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      {signInMenu ? (
        <>
          <TextInput
            value={username}
            onChangeText={(text) => setUsername(text)}
            placeholder="Username"
            textContentType="username"
            autoComplete="username"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={(text) => setPassword(text)}
            placeholder="Password"
            textContentType="password"
            autoComplete="password"
            secureTextEntry={true}
            style={styles.input}
          />
          <Button title="Go back" onPress={() => setSignInMenu(false)} />
          <Button title="Sign in!" onPress={onPasswordSignInPress} />
        </>
      ) : (
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <Image source={require('../res/logo.png')} style={styles.logo} />
          <Text>Open up console to see results!</Text>
          {GOOGLE_ID_SUPPORTED && (
            <Button
              title="Google OAuth Sign-In"
              onPress={onGoogleSignInPress}
            />
          )}
          {APPLE_ID_SUPPORTED && (
            <Button title="Apple Sign-In" onPress={onAppleSignInPress} />
          )}
          {PASSWORD_SUPPORTED && (
            <Button title="Password Sign-In" onPress={onPasswordSignInPress} />
          )}
          <Button
            title="Show Sign-In Menu"
            onPress={() => setSignInMenu(true)}
          />
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
    minWidth: 300,
    height: 40,
    backgroundColor: '#e1e1e1',
    paddingLeft: 10,
    paddingRight: 10,
  },
  button: {
    minWidth: 200,
  },
  logo: {
    width: 240,
    height: 240,
  },
});
