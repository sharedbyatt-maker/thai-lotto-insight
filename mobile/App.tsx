import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { checkTicket, loadResults, type Draw, type Results, type TicketResult } from './api';

type Tab = 'latest' | 'history' | 'check';
const tabs: { id: Tab; label: string }[] = [
  { id: 'latest', label: 'နောက်ဆုံးရလဒ်' },
  { id: 'history', label: 'မှတ်တမ်း' },
  { id: 'check', label: 'ထီတိုက်မယ်' },
];
const digit = (value: string) => value
  .replace(/[၀-၉]/g, character => String(character.charCodeAt(0) - 0x1040))
  .replace(/[๐-๙]/g, character => String(character.charCodeAt(0) - 0x0e50));

function PrizeCard({ draw }: { draw: Draw }) {
  return <View style={styles.card}>
    <Text style={styles.muted}>{draw.drawDate}</Text>
    <Text style={styles.label}>ပထမဆု</Text>
    <Text selectable style={styles.firstPrize}>{draw.firstPrize}</Text>
    <View style={styles.rule} />
    <View style={styles.prizes}>
      <Prize label="ရှေ့ ၃ လုံး" value={`${draw.front31} · ${draw.front32}`} />
      <Prize label="နောက် ၃ လုံး" value={`${draw.last31} · ${draw.last32}`} />
      <Prize label="နောက်ဆုံး ၂ လုံး" value={draw.last2} />
    </View>
  </View>;
}

function Prize({ label, value }: { label: string; value: string }) {
  return <View style={styles.prize}><Text style={styles.muted}>{label}</Text><Text selectable style={styles.amount}>{value}</Text></View>;
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.action, disabled && styles.disabled]}>
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>;
}

function Main() {
  const [tab, setTab] = useState<Tab>('latest');
  const [data, setData] = useState<Results>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [ticket, setTicket] = useState('');
  const [date, setDate] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [match, setMatch] = useState<TicketResult>();
  const [selected, setSelected] = useState<Draw>();

  async function fetchResults() {
    try { setData(await loadResults()); setLoadError(''); }
    catch { setLoadError('ရလဒ် ရယူလို့မရသေးပါ။ ပြန်စမ်းကြည့်ပါ။'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void fetchResults(); }, []);

  function refresh() {
    setLoading(true);
    setLoadError('');
    void fetchResults();
  }

  async function submit() {
    setMatch(undefined);
    if (!/^\d{6}$/.test(ticket) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      setCheckError('ထီနံပါတ် ၆ လုံးနဲ့ ရက်စွဲကို YYYY-MM-DD ပုံစံ ထည့်ပါ။');
      return;
    }
    setCheckError('');
    setChecking(true);
    try { setMatch(await checkTicket(ticket, date)); }
    catch (error) { setCheckError(error instanceof Error ? error.message : 'ထီလက်မှတ် စစ်လို့မရသေးပါ။'); }
    finally { setChecking(false); }
  }

  const latest = data?.results[0];
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.title}>ThaiLotto Insight</Text>
      <Text style={styles.muted}>ထိုင်းအစိုးရထီ ရလဒ်မှတ်တမ်း</Text>
    </View>
    <View style={styles.tabs}>
      {tabs.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }}
        style={[styles.tab, tab === item.id && styles.selected]} onPress={() => setTab(item.id)}>
        <Text style={tab === item.id ? styles.actionText : styles.label}>{item.label}</Text>
      </Pressable>)}
    </View>
    {tab === 'check' ? <FlatList data={[]} renderItem={() => null} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.card}>
        <Text style={styles.label}>ထီလက်မှတ်နံပါတ် ၆ လုံး</Text>
        <TextInput accessibilityLabel="ထီလက်မှတ်နံပါတ်" value={ticket} onChangeText={text => { setTicket(digit(text)); setMatch(undefined); }}
          keyboardType="number-pad" maxLength={6} placeholder="000000" style={styles.input} />
        <Text style={styles.label}>ထီထွက်ရက် · မထည့်ရင် နောက်ဆုံးအကြိမ်</Text>
        <TextInput accessibilityLabel="ထီထွက်ရက်" value={date} onChangeText={text => { setDate(digit(text)); setMatch(undefined); }}
          autoCapitalize="none" maxLength={10} placeholder="YYYY-MM-DD" style={styles.input} />
        <Action label={checking ? 'စစ်နေပါတယ်…' : 'ထီတိုက်မယ်'} onPress={() => void submit()} disabled={checking} />
        {!!checkError && <Text accessibilityRole="alert" style={styles.warning}>{checkError}</Text>}
        {match && <View accessibilityLiveRegion="polite" style={styles.match}>
          <Text style={styles.amount}>{match.isWinner === null ? 'ဆုစာရင်းမပြည့်သေးလို့ မဆုံးဖြတ်နိုင်သေးပါ။' : match.isWinner ? 'ဆုကိုက်ညီပါတယ်' : 'ဆုမကိုက်ညီပါ'}</Text>
          <Text style={styles.muted}>{match.drawDate}</Text>
          {match.matchedPrizes.map(prize => <Text key={prize.category + prize.matchedNumber} style={styles.label}>
            {prize.category.replaceAll('_', ' ')} · {prize.matchedNumber}
          </Text>)}
        </View>}
      </View>} />
      : <FlatList
        data={tab === 'history' ? data?.results ?? [] : []}
        keyExtractor={item => item.drawDate} contentContainerStyle={styles.content}
        refreshing={loading} onRefresh={() => void refresh()}
        ListHeaderComponent={<>
          {loading && !data && <ActivityIndicator color="#09634c" />}
          {!!loadError && <View style={styles.card}><Text style={styles.warning}>{loadError}</Text><Action label="ပြန်စမ်းမယ်" onPress={() => void refresh()} /></View>}
          {data?.status === 'stale_data' && <Text style={styles.warning}>ရလဒ်အသစ် မဝင်သေးပါ။ နောက်ဆုံးအတည်ပြုထားတဲ့ ရလဒ်ကို ပြထားပါတယ်။</Text>}
          {data?.status === 'sync_pending' && <Text style={styles.muted}>အတည်ပြုထားတဲ့ ထီရလဒ် မရှိသေးပါ။</Text>}
          {tab === 'latest' && latest && <PrizeCard draw={latest} />}
        </>}
        renderItem={({ item }) => <View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: selected?.drawDate === item.drawDate }}
            onPress={() => setSelected(selected?.drawDate === item.drawDate ? undefined : item)} style={styles.row}>
            <View><Text style={styles.label}>{item.drawDate}</Text><Text style={styles.muted}>{item.firstPrize}</Text></View>
            <Text style={styles.amount}>{item.last2}</Text>
          </Pressable>
          {selected?.drawDate === item.drawDate && <PrizeCard draw={item} />}
        </View>}
      />}
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f7f3' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: '#10352a', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  muted: { color: '#50665c', fontSize: 13, lineHeight: 23 },
  label: { color: '#173e32', fontSize: 14, fontWeight: '700', lineHeight: 24 },
  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingBottom: 6 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  selected: { backgroundColor: '#09634c' },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  card: { padding: 18, gap: 8, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dae6df' },
  firstPrize: { fontSize: 49, color: '#09634c', fontWeight: '800', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  rule: { height: 1, backgroundColor: '#dae6df', marginVertical: 5 },
  prizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  prize: { minWidth: 85, flexGrow: 1 },
  amount: { color: '#10352a', fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 29 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: '#fff' },
  warning: { color: '#7b430e', lineHeight: 25, paddingVertical: 5 },
  input: { borderColor: '#aabfb3', borderWidth: 1, borderRadius: 10, color: '#10352a', minHeight: 48, paddingHorizontal: 12, fontSize: 20 },
  action: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#09634c', borderRadius: 11, minHeight: 48 },
  disabled: { opacity: 0.6 },
  actionText: { color: '#fff', fontWeight: '700', lineHeight: 24 },
  match: { borderTopWidth: 1, borderColor: '#dae6df', paddingTop: 12 },
});
