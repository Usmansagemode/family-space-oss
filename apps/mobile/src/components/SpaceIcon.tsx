import { User, ShoppingCart } from 'lucide-react-native'

type Props = {
  type: 'person' | 'store'
  color: string
  size?: number
}

export function SpaceIcon({ type, color, size = 14 }: Props) {
  return type === 'person'
    ? <User size={size} color={color} />
    : <ShoppingCart size={size} color={color} />
}
