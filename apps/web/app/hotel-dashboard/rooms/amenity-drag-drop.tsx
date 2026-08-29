"use client";

import {useMemo, useState} from "react";
import type {DragEvent, FormEvent} from "react";
import {GripVertical, Plus, Search, Trash2} from "lucide-react";

type FacilityTuple = readonly [code: string, nameEn: string, nameAr: string, category: string];
type CustomAmenity = {code: string; name: string; category: string | null};

type Props = Readonly<{
  ar: boolean;
  facilities: readonly FacilityTuple[];
  selected: string[];
  customValue: string;
  onSelectedChange: (value: string[]) => void;
  onCustomValueChange: (value: string) => void;
}>;

export default function AmenityDragDropEditor({ar, facilities, selected, customValue, onSelectedChange, onCustomValueChange}: Props) {
  const [query, setQuery] = useState("");
  const [draggedSelected, setDraggedSelected] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const customAmenities = useMemo(() => parseCustomValue(customValue), [customValue]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const available = facilities.filter(([code, nameEn, nameAr, category]) => !selected.includes(code) && (!normalizedQuery || `${code} ${nameEn} ${nameAr} ${category}`.toLocaleLowerCase().includes(normalizedQuery)));
  const selectedFacilities = selected.flatMap((code) => {
    const found = facilities.find(([itemCode]) => itemCode === code);
    return found ? [found] : [];
  });

  function addFacility(code: string) {
    if (selected.includes(code)) return;
    onSelectedChange([...selected, code]);
  }

  function removeFacility(code: string) {
    onSelectedChange(selected.filter((item) => item !== code));
  }

  function onAvailableDragStart(event: DragEvent<HTMLElement>, code: string) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-handmekey-amenity", code);
  }

  function onSelectedDragStart(event: DragEvent<HTMLElement>, code: string) {
    setDraggedSelected(code);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-handmekey-selected-amenity", code);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const availableCode = event.dataTransfer.getData("application/x-handmekey-amenity");
    if (availableCode) addFacility(availableCode);
    setDraggedSelected(null);
  }

  function reorder(overCode: string) {
    if (!draggedSelected || draggedSelected === overCode) return;
    const from = selected.indexOf(draggedSelected);
    const to = selected.indexOf(overCode);
    if (from < 0 || to < 0) return;
    const next = [...selected];
    next.splice(from, 1);
    next.splice(to, 0, draggedSelected);
    onSelectedChange(next);
  }

  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomError(null);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
    const name = String(form.get("name") ?? "").trim().slice(0, 100);
    const category = String(form.get("category") ?? "").trim().slice(0, 60) || null;
    if (!code || !name) {
      setCustomError(ar ? "اكتب اسم المرفق والكود." : "Enter a facility name and code.");
      return;
    }
    const usedCodes = new Set([...facilities.map(([itemCode]) => itemCode), ...customAmenities.map((item) => item.code)]);
    if (usedCodes.has(code)) {
      setCustomError(ar ? "هذا الكود مستخدم مسبقًا." : "This facility code already exists.");
      return;
    }
    onCustomValueChange(serializeCustomValue([...customAmenities, {code, name, category}]));
    event.currentTarget.reset();
  }

  function removeCustom(code: string) {
    onCustomValueChange(serializeCustomValue(customAmenities.filter((item) => item.code !== code)));
  }

  return <div className="amenityDndWrap">
    <div className="amenityDndColumns">
      <section className="amenityBank">
        <div className="amenityDndTitle"><div><strong>{ar ? "المرافق المتاحة" : "Available facilities"}</strong><span>{ar ? "اسحب المرفق إلى الجهة الثانية أو اضغط عليه." : "Drag a facility to the selected area, or click it."}</span></div><b>{available.length}</b></div>
        <label className="amenitySearch"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "ابحث عن مرفق…" : "Search facilities…"}/></label>
        <div className="amenityBankList">
          {available.map(([code, nameEn, nameAr, category]) => <button key={code} type="button" draggable onDragStart={(event) => onAvailableDragStart(event, code)} onClick={() => addFacility(code)} className="amenityCard amenityAvailableCard">
            <GripVertical size={15}/><span><strong>{ar ? nameAr : nameEn}</strong><small>{category}</small></span><Plus size={15}/>
          </button>)}
          {available.length === 0 && <p className="amenityEmpty">{ar ? "لا توجد نتائج أخرى." : "No more matching facilities."}</p>}
        </div>
      </section>

      <section className="amenitySelectedPanel">
        <div className="amenityDndTitle"><div><strong>{ar ? "المرافق المختارة" : "Selected facilities"}</strong><span>{ar ? "رتّبها بالسحب؛ هذا الترتيب يظهر أولًا في بيانات الغرفة." : "Drag to reorder the facilities saved with this room."}</span></div><b>{selectedFacilities.length + customAmenities.length}</b></div>
        <div className={`amenityDropZone ${selectedFacilities.length === 0 ? "empty" : ""}`} onDragOver={(event) => {event.preventDefault(); event.dataTransfer.dropEffect = "copy";}} onDrop={onDrop}>
          {selectedFacilities.length === 0 && <div className="amenityDropHint"><Plus size={22}/><strong>{ar ? "اسحب المرافق إلى هنا" : "Drop facilities here"}</strong><span>{ar ? "أو اضغط على أي مرفق من القائمة." : "Or click any facility from the list."}</span></div>}
          {selectedFacilities.map(([code, nameEn, nameAr, category]) => <div key={code} draggable onDragStart={(event) => onSelectedDragStart(event, code)} onDragEnter={() => reorder(code)} onDragEnd={() => setDraggedSelected(null)} className={`amenityCard amenitySelectedCard ${draggedSelected === code ? "dragging" : ""}`}>
            <GripVertical size={16}/><span><strong>{ar ? nameAr : nameEn}</strong><small>{category}</small></span><button type="button" aria-label={ar ? "حذف المرفق" : "Remove facility"} onClick={() => removeFacility(code)}><Trash2 size={15}/></button>
          </div>)}
        </div>
      </section>
    </div>

    <section className="amenityCustomBox">
      <div className="amenityDndTitle"><div><strong>{ar ? "مرفق غير موجود؟" : "Need a custom facility?"}</strong><span>{ar ? "أضفه بحقول واضحة؛ لا تحتاج لاستخدام علامة | نهائيًا." : "Add it with normal fields—no pipe syntax required."}</span></div></div>
      <form className="amenityCustomForm" onSubmit={addCustom}>
        <label>{ar ? "الاسم" : "Name"}<input name="name" required placeholder={ar ? "مثال: موقد" : "Example: Fireplace"}/></label>
        <label>{ar ? "الكود" : "Code"}<input name="code" required placeholder="FIREPLACE" onChange={(event) => {event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/\s+/g, "_");}}/></label>
        <label>{ar ? "التصنيف" : "Category"}<input name="category" placeholder={ar ? "راحة" : "Comfort"}/></label>
        <button type="submit"><Plus size={16}/>{ar ? "إضافة" : "Add"}</button>
      </form>
      {customError && <p className="amenityCustomError" role="alert">{customError}</p>}
      {customAmenities.length > 0 && <div className="amenityCustomList">{customAmenities.map((item) => <div key={item.code}><span><strong>{item.name}</strong><small>{item.code}{item.category ? ` · ${item.category}` : ""}</small></span><button type="button" onClick={() => removeCustom(item.code)} aria-label={ar ? "حذف المرفق المخصص" : "Remove custom facility"}><Trash2 size={14}/></button></div>)}</div>}
    </section>
  </div>;
}

function parseCustomValue(value: string): CustomAmenity[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const [code, name, category] = line.split("|").map((part) => part.trim());
    return code && name ? [{code: code.toUpperCase(), name, category: category || null}] : [];
  });
}

function serializeCustomValue(items: CustomAmenity[]) {
  return items.map((item) => `${item.code} | ${item.name}${item.category ? ` | ${item.category}` : ""}`).join("\n");
}
