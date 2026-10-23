import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";

type Row = Record<string, unknown>;
type TableInfo = { name: string; count: number };

// A developer screen for learning SQLite: see every table, and try your own SQL
export default function DatabaseScreen() {
  const db = useSQLiteContext();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [sql, setSql] = useState("SELECT * FROM contacts");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function run(query: string) {
    try {
      const isRead = /^\s*(select|pragma|with)\b/i.test(query);
      if (isRead) {
        const result = await db.getAllAsync<Row>(query);
        setRows(result);
        setStatus(`${result.length} row${result.length === 1 ? "" : "s"}`);
      } else {
        const result = await db.runAsync(query);
        setRows([]);
        setStatus(`${result.changes} row(s) changed`);
        await loadTables(); // counts may have changed
      }
    } catch (error) {
      setRows([]);
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // sqlite_master is SQLite's own table that lists every table in the database
  const loadTables = useCallback(async () => {
    const list = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const withCounts: TableInfo[] = [];
    for (const { name } of list) {
      // Table names can't be passed as ? parameters, so we quote the name from sqlite_master instead
      const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM "${name}"`);
      withCounts.push({ name, count: row?.count ?? 0 });
    }
    setTables(withCounts);
  }, [db]);

  useEffect(() => {
    loadTables();
    db.getAllAsync<Row>("SELECT * FROM contacts").then((result) => {
      setRows(result);
      setStatus(`${result.length} rows`);
    });
  }, [db, loadTables]);

  function openTable(name: string) {
    const query = `SELECT * FROM ${name}`;
    setSql(query);
    run(query);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <ScreenHeader title="Database" />
      </View>

      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Tables */}
        <Text style={styles.sectionTitle}>Tables</Text>
        <View style={styles.tables}>
          {tables.map((t) => (
            <Pressable key={t.name} style={styles.tableChip} onPress={() => openTable(t.name)}>
              <Text style={styles.tableName}>{t.name}</Text>
              <Text style={styles.tableCount}>{t.count}</Text>
            </Pressable>
          ))}
        </View>

        {/* SQL box */}
        <Text style={styles.sectionTitle}>Run SQL</Text>
        <TextInput
          style={styles.sqlInput}
          value={sql}
          onChangeText={setSql}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="SELECT * FROM transactions WHERE amount < 0"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.runButton} onPress={() => run(sql)}>
          <Text style={styles.runText}>Run</Text>
        </Pressable>

        {status ? (
          <Text style={[styles.status, status.startsWith("Error") && styles.error]}>{status}</Text>
        ) : null}

        {/* Results: one card per row, one line per column */}
        {rows.map((row, index) => (
          <View key={index} style={styles.rowCard}>
            {Object.entries(row).map(([column, value]) => (
              <View key={column} style={styles.cell}>
                <Text style={styles.column}>{column}</Text>
                <Text style={styles.value} numberOfLines={2}>
                  {value === null ? "NULL" : String(value)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  screen: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  tables: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tableChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  tableName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  tableCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.primary },
  sqlInput: {
    minHeight: 72,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 13,
    color: colors.text,
    textAlignVertical: "top",
  },
  runButton: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  runText: { fontFamily: fonts.semibold, fontSize: 15, color: "white" },
  status: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  error: { color: colors.danger },
  rowCard: {
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cell: { flexDirection: "row", gap: spacing.sm },
  column: { width: 90, fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
});
