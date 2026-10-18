import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { useAuthContext } from '../contexts/auth'

export function LoginScreen() {
  const { signInWithGoogle, loading } = useAuthContext()

  return (
    <View className="flex-1 bg-sand items-center justify-center px-8">
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/family-space-logo.jpg')}
        className="w-20 h-20 rounded-3xl mb-6"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
        }}
      />

      <Text className="text-4xl font-bold text-ink mb-2 tracking-tight">
        Family Space
      </Text>
      <Text className="text-base text-ink-muted mb-14 text-center">
        Your family, organised.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4A8DB8" />
      ) : (
        <Pressable
          className="bg-brand rounded-2xl py-4 px-8 active:opacity-80"
          onPress={signInWithGoogle}
          style={{
            shadowColor: '#344BA0',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <Text className="text-white text-base font-semibold">
            Continue with Google
          </Text>
        </Pressable>
      )}
    </View>
  )
}
