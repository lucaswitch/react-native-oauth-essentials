import { Pressable, StyleSheet, Text } from 'react-native';

export function Button({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    width: 240,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 4,
  },
  text: {
    color: '#fff',
  },
  image: {
    width: 40,
    height: 20,
  },
});
