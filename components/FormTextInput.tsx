import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/constants/theme';

type FormTextInputProps = TextInputProps & {
  label: string;
};

export function FormTextInput({ label, style, ...props }: FormTextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedText}
        style={[styles.input, style]}
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
