// PLANEJAMENTO DE MATERIAIS DA OBRA
// Calcula o total estimado por metragem, controla pedidos parciais e alerta
// quando o pedreiro deve montar o proximo pedido.

const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5];

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base, amount) {
  const date = new Date(`${String(base).slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + Number(amount || 0));
  return date.toISOString().slice(0, 10);
}

function diffDays(from, to) {
  const start = new Date(`${String(from).slice(0, 10)}T12:00:00`);
  const end = new Date(`${String(to).slice(0, 10)}T12:00:00`);
  return Math.round((end - start) / 86400000);
}

function fmtDate(value) {
  if (!value) return '--';
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function parseJson(raw, fallback) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || 'null') : raw;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function roundQuantity(value, decimals = 2) {
  return Number((Number(value) || 0).toFixed(decimals));
}

function normalizeWorkdays(value) {
  const raw = Array.isArray(value) ? value : parseJson(value, DEFAULT_WORKDAYS);
  const unique = [...new Set(raw.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6))];
  return unique.length ? unique.sort((a, b) => a - b) : DEFAULT_WORKDAYS;
}

function normalizeMaterials(value) {
  const raw = Array.isArray(value) ? value : parseJson(value, []);
  return raw
    .map((item) => ({
      name: String(item?.name || '').trim(),
      unit: String(item?.unit || 'un').trim() || 'un',
      consumption_per_m2: Math.max(0, Number(item?.consumption_per_m2) || 0),
      min_purchase: Math.max(0, Number(item?.min_purchase) || 0),
      ordered_quantity: Math.max(0, Number(item?.ordered_quantity) || 0),
      current_order_quantity: Math.max(0, Number(item?.current_order_quantity) || 0),
    }))
    .filter((item) => item.name && item.consumption_per_m2 > 0);
}

function normalizeOrderItems(value) {
  const raw = Array.isArray(value) ? value : parseJson(value, []);
  return raw
    .map((item) => ({
      index: Number.isInteger(Number(item?.index)) ? Number(item.index) : null,
      name: String(item?.name || '').trim(),
      unit: String(item?.unit || 'un').trim() || 'un',
      quantity: Math.max(0, Number(item?.quantity) || 0),
    }))
    .filter((item) => item.quantity > 0 && (item.index !== null || item.name));
}

function materialKey(item) {
  return `${String(item.name || '').trim().toLowerCase()}::${String(item.unit || '').trim().toLowerCase()}`;
}

function isProductionDay(dateIso, workdays) {
  const date = new Date(`${String(dateIso).slice(0, 10)}T12:00:00`);
  return workdays.includes(date.getDay());
}

function addProductionDays(startIso, productionDays, workdays) {
  if (productionDays <= 0) return String(startIso).slice(0, 10);

  let current = String(startIso).slice(0, 10);
  let counted = 0;
  let guard = 0;

  while (counted < productionDays && guard < 730) {
    if (isProductionDay(current, workdays)) counted += 1;
    if (counted >= productionDays) return current;
    current = addDays(current, 1);
    guard += 1;
  }

  return current;
}

function previousProductionDay(dateIso, workdays) {
  let current = String(dateIso).slice(0, 10);
  let guard = 0;

  while (!isProductionDay(current, workdays) && guard < 30) {
    current = addDays(current, -1);
    guard += 1;
  }

  return current;
}

function workdaysLabel(workdays) {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  return workdays.map((day) => labels[day]).join(', ');
}

function roundSuggestedQuantity(quantity, minPurchase, maxQuantity) {
  if (quantity <= 0) return 0;
  const rounded = minPurchase > 0
    ? Math.ceil(quantity / minPurchase) * minPurchase
    : quantity;
  return roundQuantity(Math.min(rounded, maxQuantity));
}

function calculateMaterialPlan(rule, baseDate = todayIso()) {
  const workdays = normalizeWorkdays(rule.workdays_json ?? rule.workdays);
  const materials = normalizeMaterials(rule.materials_json ?? rule.materials);
  const areaTotal = Math.max(0, Number(rule.area_total) || 0);
  const areaDone = Math.min(areaTotal, Math.max(0, Number(rule.area_done) || 0));
  const areaRemaining = Math.max(0, areaTotal - areaDone);
  const dailyArea = Math.max(0, Number(rule.daily_area) || 0);
  const lossFactor = 1 + Math.max(0, Number(rule.loss_percent) || 0) / 100;
  const leadDays = Math.max(0, Math.ceil(Number(rule.delivery_days || 0) + Number(rule.safety_days || 0)));
  const today = String(baseDate).slice(0, 10);
  const productionDaysRemaining = dailyArea > 0 ? Math.ceil(areaRemaining / dailyArea) : null;
  const completionEstimateDate = productionDaysRemaining === null
    ? null
    : addProductionDays(today, productionDaysRemaining, workdays);

  const items = materials.map((material, index) => {
    const totalNeeded = roundQuantity(areaTotal * material.consumption_per_m2 * lossFactor);
    const orderedQuantity = roundQuantity(Math.min(material.ordered_quantity, totalNeeded));
    const remainingQuantity = roundQuantity(Math.max(0, totalNeeded - orderedQuantity));
    const currentOrderQuantity = roundQuantity(Math.min(material.current_order_quantity, remainingQuantity));
    const remainingAfterCurrentOrder = roundQuantity(Math.max(0, remainingQuantity - currentOrderQuantity));
    const dailyUse = roundQuantity(dailyArea * material.consumption_per_m2 * lossFactor, 4);
    const productionDaysCovered = dailyUse > 0 ? orderedQuantity / dailyUse : null;
    const stockoutProductionDays = productionDaysCovered === null ? null : Math.ceil(productionDaysCovered);
    const stockoutDate = stockoutProductionDays === null
      ? null
      : addProductionDays(today, stockoutProductionDays, workdays);
    const rawRequestDate = stockoutDate ? addDays(stockoutDate, -leadDays) : null;
    const requestDate = rawRequestDate ? previousProductionDay(rawRequestDate, workdays) : null;
    const daysUntilRequest = requestDate ? diffDays(today, requestDate) : null;
    const daysUntilStockout = stockoutDate ? diffDays(today, stockoutDate) : null;
    const shouldRequest = remainingQuantity > 0 && daysUntilRequest !== null && daysUntilRequest <= 0;
    const suggestedBase = dailyUse > 0
      ? dailyUse * Math.max(leadDays + 5, 7)
      : remainingQuantity;
    const suggestedOrderQuantity = roundSuggestedQuantity(
      Math.min(remainingQuantity, suggestedBase),
      material.min_purchase,
      remainingQuantity
    );

    return {
      ...material,
      index,
      total_needed: totalNeeded,
      ordered_quantity: orderedQuantity,
      remaining_quantity: remainingQuantity,
      current_order_quantity: currentOrderQuantity,
      remaining_after_current_order: remainingAfterCurrentOrder,
      daily_use: dailyUse,
      production_days_covered: productionDaysCovered === null
        ? null
        : roundQuantity(productionDaysCovered, 1),
      stockout_date: stockoutDate,
      request_date: requestDate,
      days_until_request: daysUntilRequest,
      days_until_stockout: daysUntilStockout,
      suggested_order_quantity: suggestedOrderQuantity,
      should_request: shouldRequest,
      status: remainingQuantity <= 0
        ? 'finalizado'
        : shouldRequest
          ? 'montar_pedido'
          : 'planejado',
    };
  });

  const requestNowItems = items.filter((item) => item.should_request);
  const pendingItems = items.filter((item) => item.remaining_quantity > 0);
  const nextRequestDate = pendingItems
    .map((item) => item.request_date)
    .filter(Boolean)
    .sort()[0] || null;
  const nextRequestInDays = nextRequestDate ? diffDays(today, nextRequestDate) : null;
  const orderedPercent = items.length
    ? items.reduce((sum, item) => sum + item.ordered_quantity, 0) /
      Math.max(items.reduce((sum, item) => sum + item.total_needed, 0), 1) * 100
    : 0;

  return {
    today,
    area_total: areaTotal,
    area_done: areaDone,
    area_remaining: roundQuantity(areaRemaining),
    progress_percent: areaTotal > 0 ? roundQuantity((areaDone / areaTotal) * 100, 1) : 0,
    ordered_percent: roundQuantity(Math.min(orderedPercent, 100), 1),
    production_days_remaining: productionDaysRemaining,
    completion_estimate_date: completionEstimateDate,
    daily_area: dailyArea,
    workdays,
    workdays_label: workdaysLabel(workdays),
    lead_days: leadDays,
    should_request: requestNowItems.length > 0,
    next_request_date: nextRequestDate,
    next_request_in_days: nextRequestInDays,
    request_now_items: requestNowItems,
    items,
  };
}

function applyMaterialOrder(rule, orderItems) {
  const materials = normalizeMaterials(rule.materials_json ?? rule.materials);
  const analysisBefore = calculateMaterialPlan({ ...rule, materials });
  const requested = normalizeOrderItems(orderItems);
  const orderedItems = [];
  const quantitiesByIndex = new Map();
  const quantitiesByKey = new Map();

  requested.forEach((item) => {
    if (item.index !== null) {
      quantitiesByIndex.set(item.index, (quantitiesByIndex.get(item.index) || 0) + item.quantity);
      return;
    }
    const key = materialKey(item);
    quantitiesByKey.set(key, (quantitiesByKey.get(key) || 0) + item.quantity);
  });

  const updatedMaterials = materials.map((material, index) => {
    const analyzed = analysisBefore.items[index];
    const requestedQuantity = quantitiesByIndex.get(index) || quantitiesByKey.get(materialKey(material)) || 0;
    const acceptedQuantity = roundQuantity(Math.min(requestedQuantity, analyzed?.remaining_quantity || 0));

    if (acceptedQuantity > 0) {
      orderedItems.push({
        index,
        name: material.name,
        unit: material.unit,
        quantity: acceptedQuantity,
        remaining_after_order: roundQuantity((analyzed?.remaining_quantity || 0) - acceptedQuantity),
      });
    }

    return {
      ...material,
      ordered_quantity: roundQuantity((analyzed?.ordered_quantity || 0) + acceptedQuantity),
      current_order_quantity: 0,
    };
  });

  const analysisAfter = calculateMaterialPlan({ ...rule, materials: updatedMaterials });

  return {
    materials: updatedMaterials,
    orderedItems,
    analysis: analysisAfter,
    message: buildMaterialRequestMessage(rule, analysisAfter, orderedItems),
  };
}

function buildMaterialRequestMessage(rule, analysis = calculateMaterialPlan(rule), orderItems = null) {
  const clientName = rule.client_name || 'cliente';
  const title = rule.title || rule.service_type || 'obra';
  const items = Array.isArray(orderItems) && orderItems.length
    ? orderItems
    : analysis.items
      .filter((item) => item.current_order_quantity > 0 || item.should_request)
      .map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.current_order_quantity || item.suggested_order_quantity || item.remaining_quantity,
        remaining_after_order: Math.max(0, item.remaining_quantity - (item.current_order_quantity || item.suggested_order_quantity || 0)),
      }))
      .filter((item) => item.quantity > 0);
  const materialLines = items.map((item) => {
    const remaining = item.remaining_after_order !== undefined
      ? ` | saldo depois: ${item.remaining_after_order} ${item.unit}`
      : '';
    return `- ${item.quantity} ${item.unit} de ${item.name}${remaining}`;
  });

  return [
    'Ola, tudo bem?',
    '',
    `Segue pedido parcial de materiais para a obra *${title}*:`,
    '',
    materialLines.length ? materialLines.join('\n') : '- Nenhum material selecionado no momento',
    '',
    `Metragem total planejada: ${analysis.area_total} m2`,
    `Area restante estimada: ${analysis.area_remaining} m2`,
    `Dias produtivos considerados: ${analysis.workdays_label}`,
    analysis.next_request_date ? `Proximo pedido sugerido: ${fmtDate(analysis.next_request_date)}` : '',
    rule.client_name ? `Cliente/obra: ${clientName}` : '',
  ].filter(Boolean).join('\n');
}

function buildMaterialAlertText(rule, analysis = calculateMaterialPlan(rule)) {
  const dateText = analysis.next_request_date ? fmtDate(analysis.next_request_date) : 'hoje';
  const items = analysis.request_now_items.slice(0, 3).map((item) => item.name).join(', ');
  return [
    `A obra ${rule.title || 'sem titulo'} chegou no ponto de montar um novo pedido de materiais.`,
    items ? `Materiais em alerta: ${items}.` : '',
    `Pedido sugerido para: ${dateText}.`,
    `Saldo planejado: ${analysis.ordered_percent}% dos materiais totais ja foram pedidos.`,
  ].filter(Boolean).join(' ');
}

module.exports = {
  DEFAULT_WORKDAYS,
  addDays,
  applyMaterialOrder,
  buildMaterialAlertText,
  buildMaterialRequestMessage,
  calculateMaterialPlan,
  fmtDate,
  normalizeMaterials,
  normalizeOrderItems,
  normalizeWorkdays,
  todayIso,
  workdaysLabel,
};
