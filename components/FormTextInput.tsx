import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type FormTextInputProps = TextInputProps & {
  label: string;
};

export function FormTextInput({ label, style, ...props }: FormTextInputProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.textPrimary,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
