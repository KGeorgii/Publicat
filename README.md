# Publicat

**Publicat** is a fast, scalable, and beautiful web app that transforms any structured `.csv` bibliography into an interactive journal explorer. Featuring timeline views, search capabilities, and D3.js visualizations, it's the perfect way to share archival metadata with the world—instantly.

This project builds on the structure of [vsesvit.vercel.app](https://vsesvit.vercel.app) and generalizes it for *any* CSV-based journal archive.

---

## 🚀 Features

- 📂 **Plug & Play CSV Input** — Just drop in your `.csv` file.
- 🕰️ **Browse by Decade** — Explore issues across time.
- 🔍 **Search Everything** — Find articles by author, title, translator.
- 📊 **Visual Analytics** — Unique authors per decade, country/language distributions.
- 🌙 **Dark Mode by Default** (with slick UI)
- 🤖 **Future-Ready** — Built with React (Next.js) + D3 + PapaParse
- 💬 **Built-in AI Assistant** — Ask questions about the data in natural language

---

## 📂 How to Use with Your Own CSV

### 1. Format Your CSV

Your `.csv` file should have the following columns (headers must be exact):

```csv
journal_id,journal_name,journal_year,journal_number,article_name,author,translator,country,country_latin,language,language_latin
```

You can leave fields blank if not applicable.

### 2. Add Your File

Put your `.csv` inside the `/public/data/` folder.

Rename it something like `my_journal_data.csv`.

### 3. Update Code References

Search across the codebase and update:

```tsx
const CSV_URL = '/data/data_2.csv';
```

To:

```tsx
const CSV_URL = '/data/my_journal_data.csv';
```

This is found in:
- `index.tsx`
- `search.tsx`
- `visualizations.tsx`
- `ai_chat.tsx`

### 4. (Optional) Update Branding

Edit:
```tsx
<title>Vsesvit</title>
```
To:
```tsx
<title>Publicat</title>
```

Also update logos, meta descriptions, and `about.tsx` for your own flavor.

---

## 🚢 Deploy on Vercel

#### Option 1: Via GitHub
- Push your project to GitHub
- Go to [vercel.com](https://vercel.com)
- Connect your repo & deploy

#### Option 2: Via CLI

```bash
npm install -g vercel
vercel
```

Follow the interactive prompts. 

---

## 🔧 Tech Stack
- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [D3.js](https://d3js.org/)
- [PapaParse](https://www.papaparse.com/) (CSV parsing)
- [Vercel](https://vercel.com/) (deployment)

---

## 💪 Contributing
Have a cool CSV use case? Want to improve visualizations? PRs are welcome!

1. Fork the repo
2. Clone it locally
3. Install dependencies:

```bash
npm install
```

4. Run dev server:
```bash
npm run dev
```

---

## 📞 Contact

Created by [@KGeorgii](https://github.com/KGeorgii). Feel free to open issues or reach out for collaboration ideas!

---

## ✈️ License

MIT License.

<br />
<br />
<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

<br />
<br />
<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge-2026.svg" />
</a>
