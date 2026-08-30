import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import {
  COLOR_OPTIONS, SHAPE_OPTIONS, genId, usedColors, usedShapes,
  firstAvailable,
} from '../utils/fields';
import Shape, { ConfettiIcon } from '../components/Shape';

const emptyForm = { name: '', type: 'bool', color: COLOR_OPTIONS[0], shape: SHAPE_OPTIONS[0], target: '8', metric: '', step: '1' };

export default function ConfigScreen({ onClose }) {
  const { customFields, persistCustomFields } = useData();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openNew() {
    const used = usedColors(customFields, null);
    const usedS = usedShapes(customFields, null);
    setForm({
      ...emptyForm,
      color: firstAvailable(COLOR_OPTIONS, used),
      shape: firstAvailable(SHAPE_OPTIONS, usedS),
    });
    setEditId(null);
    setFormOpen(true);
  }
  function openEdit(f) {
    setForm({
      name: f.name, type: f.type, color: f.color, shape: f.shape,
      target: String(f.target ?? 8), metric: f.metric || '', step: String(f.step ?? 1),
    });
    setEditId(f.id);
    setFormOpen(true);
  }
  function moveField(index, dir) {
    const next = [...customFields];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    persistCustomFields(next);
  }
  function removeField(id) {
    persistCustomFields(customFields.filter((f) => f.id !== id));
  }
  function parseDec(v, fallback) {
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? fallback : n;
  }
  function save() {
    const name = form.name.trim();
    if (!name) return;
    const target = Math.max(0.01, parseDec(form.target, 8));
    const step = Math.max(0.01, parseDec(form.step, 1));
    const metric = form.metric.trim();
    if (editId === null) {
      if (customFields.length >= 10) return;
      const field = { id: genId(), name, type: form.type, color: form.color, shape: form.shape, target, metric, step };
      persistCustomFields([...customFields, field]);
    } else {
      persistCustomFields(customFields.map((f) => f.id === editId ? { ...f, name, type: form.type, color: form.color, shape: form.shape, target, metric, step } : f));
    }
    setFormOpen(false);
  }

  const used = usedColors(customFields, editId);
  const usedS = usedShapes(customFields, editId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Configurações</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Fechar</Text></TouchableOpacity>
        )}
      </View>
      <Text style={styles.intro}>
        Perfect e ProudOfMe mantêm-se sempre. Os restantes campos são teus — até 10, cada um com o tipo,
        cor e ícone que escolheres.
      </Text>

      <View style={styles.fixedRow}>
        <View style={styles.fixedChip}>
          <ConfettiIcon size={16} />
          <Text style={styles.fixedChipText}>ProudOfMe</Text>
          <Text style={styles.lock}>🔒</Text>
        </View>
        <View style={styles.fixedChip}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.c4 }} />
          <Text style={styles.fixedChipText}>Perfect!</Text>
          <Text style={styles.lock}>🔒</Text>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Os teus campos</Text>
        <Text style={styles.count}>({customFields.length}/10)</Text>
      </View>

      <View style={{ gap: 8, marginBottom: 12 }}>
        {customFields.map((f, i) => (
          <View key={f.id} style={styles.fieldRowCfg}>
            <Shape shape={f.shape} color={f.color} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fname}>{f.name}</Text>
              <Text style={styles.ftype}>
                {f.type === 'bool' ? 'Booleano' : `Contagem · ${f.target}${f.metric ? ' ' + f.metric : ''} · passo ${f.step}`}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity disabled={i === 0} onPress={() => moveField(i, -1)}>
                <Text style={[styles.actionBtn, i === 0 && styles.actionBtnDisabled]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={i === customFields.length - 1} onPress={() => moveField(i, 1)}>
                <Text style={[styles.actionBtn, i === customFields.length - 1 && styles.actionBtnDisabled]}>↓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(f)}>
                <Text style={styles.actionBtn}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeField(f.id)}>
                <Text style={styles.actionBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.addBtn, customFields.length >= 10 && styles.addBtnDisabled]}
        disabled={customFields.length >= 10}
        onPress={openNew}
      >
        <Text style={styles.addBtnText}>+ Novo campo</Text>
      </TouchableOpacity>

      {formOpen && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editId === null ? 'Novo campo' : 'Editar campo'}</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="ex.: Leitura, Meditação, Skincare…"
            placeholderTextColor={COLORS.inkSoft}
          />

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === 'bool' && styles.typeBtnActive]}
              onPress={() => setForm((f) => ({ ...f, type: 'bool' }))}
            >
              <Text style={[styles.typeBtnText, form.type === 'bool' && styles.typeBtnTextActive]}>Booleano</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === 'count' && styles.typeBtnActive]}
              onPress={() => setForm((f) => ({ ...f, type: 'count' }))}
            >
              <Text style={[styles.typeBtnText, form.type === 'count' && styles.typeBtnTextActive]}>Contagem</Text>
            </TouchableOpacity>
          </View>

          {form.type === 'count' && (
            <>
              <Text style={styles.label}>Valor / meta</Text>
              <TextInput style={styles.input} value={form.target} onChangeText={(v) => setForm((f) => ({ ...f, target: v }))} keyboardType="decimal-pad" placeholder="ex.: 60" placeholderTextColor={COLORS.inkSoft} />
              <Text style={styles.label}>Métrica</Text>
              <TextInput style={styles.input} value={form.metric} onChangeText={(v) => setForm((f) => ({ ...f, metric: v }))} placeholder="ex.: minutos, litros…" placeholderTextColor={COLORS.inkSoft} />
              <Text style={styles.label}>Incremento a cada − / +</Text>
              <TextInput style={styles.input} value={form.step} onChangeText={(v) => setForm((f) => ({ ...f, step: v }))} keyboardType="decimal-pad" placeholder="ex.: 15 ou 0,5" placeholderTextColor={COLORS.inkSoft} />
            </>
          )}

          <Text style={styles.label}>Cor</Text>
          <View style={styles.swatchGrid}>
            {COLOR_OPTIONS.map((c) => {
              const disabled = used.includes(c) && c !== form.color;
              return (
                <TouchableOpacity
                  key={c}
                  disabled={disabled}
                  style={[styles.swatch, { backgroundColor: c }, form.color === c && styles.swatchSelected, disabled && styles.swatchDisabled]}
                  onPress={() => setForm((f) => ({ ...f, color: c }))}
                >
                  {disabled && <Text style={styles.swatchX}>✕</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>Cada cor só pode ser usada por um campo.</Text>

          <Text style={styles.label}>Ícone</Text>
          <View style={styles.iconGrid}>
            {SHAPE_OPTIONS.map((s) => {
              const disabled = usedS.includes(s) && s !== form.shape;
              return (
                <TouchableOpacity
                  key={s}
                  disabled={disabled}
                  style={[styles.iconOpt, form.shape === s && styles.iconOptSelected]}
                  onPress={() => setForm((f) => ({ ...f, shape: s }))}
                >
                  <Shape shape={s} color={disabled ? COLORS.inkSoft : form.color} size={16} />
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>Cada ícone só pode ser usado por um campo.</Text>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setFormOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>{editId === null ? 'Guardar campo' : 'Atualizar campo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  closeText: { color: COLORS.electro, fontFamily: FONTS.bodyBold, fontSize: 13 },
  intro: { fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 18, marginBottom: 18 },

  fixedRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  fixedChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 12 },
  fixedChipText: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: COLORS.ink, flex: 1 },
  lock: { fontSize: 10, color: COLORS.inkSoft },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  sectionHeader: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold },
  count: { fontFamily: FONTS.monoRegular, color: COLORS.inkSoft, fontSize: 12 },

  fieldRowCfg: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 11 },
  fname: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.ink },
  ftype: { fontFamily: FONTS.monoRegular, fontSize: 10.5, color: COLORS.inkSoft, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 2 },
  actionBtn: { color: COLORS.inkSoft, fontSize: 15, padding: 6 },
  actionBtnDisabled: { opacity: 0.25 },

  addBtn: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, borderStyle: 'dashed', alignItems: 'center', marginBottom: 6 },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 13.5 },

  formCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 18, marginTop: 14 },
  formTitle: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.ink, marginBottom: 14 },
  label: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: { padding: 11, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 14 },

  typeToggle: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  typeBtnActive: { backgroundColor: COLORS.electro, borderColor: COLORS.electro },
  typeBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 13 },
  typeBtnTextActive: { color: COLORS.bg },

  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: '17%', aspectRatio: 1, borderRadius: 8, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderColor: COLORS.ink },
  swatchDisabled: { opacity: 0.22 },
  swatchX: { color: '#fff', fontSize: 13 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOpt: { width: '17%', aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.bg, borderWidth: 2, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  iconOptSelected: { borderColor: COLORS.ink, backgroundColor: '#22262b' },

  hint: { fontSize: 10.5, color: COLORS.inkSoft, marginTop: 6, lineHeight: 15 },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, alignItems: 'center' },
  cancelBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 14 },
  saveBtn: { flex: 1, padding: 13, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 14 },
});
