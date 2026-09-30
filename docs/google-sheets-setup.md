# Configuración de Google Sheets para el Tracker Matutino

Con este setup, cada vez que hagas clic en **"Guardar Registro & Sincronizar"** (o presiones `Ctrl+S` / `Cmd+S`) en el Dashboard, los datos se envían automáticamente a tu planilla de Google Sheets y actualizan gráficos en tiempo real.

---

## Paso 1: Crear la Planilla

1. Entrá a [sheets.new](https://sheets.new) en tu navegador (se crea una planilla en blanco).
2. Ponéle de nombre: **`Buenos Días — Tracker de Hábitos & Metas`**.
3. Renombrá la primera pestaña a: **`Registro Diario`**.

---

## Paso 2: Pegar el código de Apps Script

1. En el menú superior de la planilla, hacé clic en **Extensiones → Apps Script**.
2. Borrá todo el contenido que aparezca en el editor y pegá este código:

```javascript
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registro Diario") || ss.getSheets()[0];

    // Si la hoja está vacía, crear encabezados automáticos con formato
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Fecha", "Hora", "Ritmo", "Energía", "Desayuno", 
        "Entrenó Ayer", "Agua", "Meta Ayer", "Meta Ayer Lograda", 
        "Meta Hoy (P0)", "Idea / Brain Dump"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold")
                 .setBackground("#0f172a")
                 .setFontColor("#f8fafc")
                 .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Agregar la fila con las respuestas del día
    sheet.appendRow([
      data.fecha || Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "yyyy-MM-dd"),
      data.hora || Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "HH:mm:ss"),
      formatearRitmo(data.ritmo),
      formatearEnergia(data.energia),
      formatearDesayuno(data.desayuno),
      formatearEntreno(data.entrenoAyer),
      data.agua ? "Sí 💧" : "No",
      data.metaAyer || "",
      data.metaAyerLograda || "",
      data.metaHoy || "",
      data.ideas || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatearRitmo(v) {
  if (v === "atiempo") return "A tiempo 🟢";
  if (v === "apurado") return "Apurado 🔴";
  return v || "";
}

function formatearEnergia(v) {
  if (v === "alta") return "Alta ⚡";
  if (v === "media") return "Media 🔋";
  if (v === "baja") return "Baja 🪫";
  return v || "";
}

function formatearDesayuno(v) {
  if (v === "desayune") return "Desayunó ☕";
  if (v === "ayuno") return "Ayuno ⏳";
  return v || "";
}

function formatearEntreno(v) {
  if (v === "si") return "Entrenó 💪";
  if (v === "descanso") return "Descanso 🛌";
  return v || "";
}
```

3. Hacé clic en el ícono de **Guardar** (disquete).

---

## Paso 3: Desplegar como Web App

1. Arriba a la derecha, hacé clic en **Implementar → Nueva implementación**.
2. En el engranaje ⚙️ a la izquierda, seleccioná **Aplicación web**.
3. Completá:
   * **Descripción**: `Tracker Buenos Días API`
   * **Ejecutar como**: `Yo (tu correo)`
   * **Quién tiene acceso**: **`Cualquiera`** *(es indispensable para que el Dashboard local pueda enviar los datos sin login manual).*
4. Hacé clic en **Implementar**.
5. Autorizá los permisos con tu cuenta de Google.
6. Copiá la **URL de la aplicación web** (termina en `/exec`).

---

## Paso 4: Configurar en tu archivo `.env`

En la carpeta raíz del proyecto, abrí tu archivo `.env` y pegá la URL:

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
```

¡Listo! A partir de ese momento, cada vez que hagas clic en **"Guardar Registro & Sincronizar"** en el panel matutino, la información se guardará en tu Google Sheet automáticamente.
