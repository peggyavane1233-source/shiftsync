import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Screen, Text, Button, Card, StatusPill, Spinner, TallyTag } from '../src/components/ui';
import { useTheme, spacing, darkTheme, lightTheme } from '../src/theme';

export default function DevSandbox() {
  const { mode, setMode, ...theme } = useTheme();

  return (
    <Screen style={{ backgroundColor: theme.seam }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="display" weight="bold" style={{ color: theme.headlamp }}>UI SANDBOX</Text>
          <Button 
            title={`SWITCH TO ${mode === 'dark' ? 'LIGHT' : 'DARK'} THEME`} 
            variant="secondary" 
            onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} 
          />
        </View>

        <Section title="TYPOGRAPHY">
          <Text variant="hero" style={{ color: theme.headlamp }}>Hero Text 72</Text>
          <Text variant="display" style={{ color: theme.headlamp }}>Display Text 40</Text>
          <Text variant="title" style={{ color: theme.headlamp }}>Title Text 28</Text>
          <Text variant="status" style={{ color: theme.dust }}>STATUS TEXT 20</Text>
          <Text variant="bodyLg" style={{ color: theme.headlamp }}>Body Large 18. This is how the regular text looks for high readability.</Text>
          <Text variant="body" style={{ color: theme.headlamp }}>Body Regular 16. Used for secondary descriptions and minor text.</Text>
          <Text variant="label" style={{ color: theme.primary }}>LABEL 14</Text>
          <Text variant="dataLg" style={{ color: theme.headlamp }}>12:45:00.00</Text>
          <Text variant="data" style={{ color: theme.headlamp }}>12:45:00.00</Text>
          <Text variant="caption" style={{ color: theme.dust }}>12:45:00.00</Text>
        </Section>

        <Section title="TALLY TAGS">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}>
            <TallyTag employeeNo="A-047" name="KWAME O." state="on-hook" />
            <TallyTag employeeNo="A-047" name="KWAME O." state="off-hook" />
            <TallyTag employeeNo="A-047" name="KWAME O." state="unaccounted" />
          </ScrollView>
          <Text variant="label" style={{ color: theme.dust, marginTop: spacing.md }}>SIZING MATRIX (SM / MD / LG)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md, alignItems: 'flex-end' }}>
            <TallyTag employeeNo="B-12" name="JOHN D." state="off-hook" size="sm" />
            <TallyTag employeeNo="B-12" name="JOHN D." state="off-hook" size="md" />
            <TallyTag employeeNo="B-12" name="JOHN D." state="off-hook" size="lg" />
          </ScrollView>
        </Section>

        <Section title="BUTTONS (TAP_MIN >= 56)">
          <View style={{ gap: spacing.md }}>
            <Button title="PRIMARY (LAMP)" variant="primary" />
            <Button title="SECONDARY (OUTLINE)" variant="secondary" />
            <Button title="DANGER (RED)" variant="danger" />
            <Button title="GHOST (TEXT ONLY)" variant="ghost" />
            <Button title="LOADING STATE" loading variant="primary" />
            <Button title="DISABLED STATE" disabled variant="primary" />
            <Button title="LARGE VARIANT" size="lg" variant="primary" />
          </View>
        </Section>

        <Section title="STATUS PILLS (COLOR + ICON + WORD)">
          <View style={{ gap: spacing.md, flexDirection: 'row', flexWrap: 'wrap' }}>
            <StatusPill variant="safe" label="SAFE" />
            <StatusPill variant="advisory" label="ADVISORY" />
            <StatusPill variant="warning" label="WARNING" />
            <StatusPill variant="danger" label="DANGER" />
            <StatusPill variant="neutral" label="NEUTRAL" />
          </View>
        </Section>

        <Section title="SPINNER & CARDS">
          <Card padding="xl">
            <Text variant="label" style={{ color: theme.dust, marginBottom: spacing.md }}>SYSTEM BUSY</Text>
            <View style={{ alignItems: 'center' }}>
              <Spinner size={32} />
            </View>
          </Card>
        </Section>

      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: theme.rule }]}>
      <Text variant="label" style={{ color: theme.shadow, marginBottom: spacing.lg }}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  section: {
    paddingTop: spacing.xl,
    marginBottom: spacing.xxl,
    borderTopWidth: 1,
  }
});
