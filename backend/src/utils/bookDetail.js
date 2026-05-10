/**
 * Shared helpers for book detail responses (librarian + student APIs).
 * Borrow status rules:
 * - available: at least one copy is AVAILABLE
 * - borrowed: no AVAILABLE copies, but at least one copy is BORROWED (all copies checked out)
 * - unavailable: no copies, or no AVAILABLE/BORROWED workflow (e.g. all LOST/DAMAGED)
 */
function computeBorrowMeta(barcodes) {
  const list = Array.isArray(barcodes) ? barcodes : [];
  const totalCopies = list.length;
  const availableCount = list.filter((bc) => bc.status === 'AVAILABLE').length;
  const hasBorrowed = list.some((bc) => bc.status === 'BORROWED');

  let borrowStatus = 'unavailable';
  if (availableCount > 0) {
    borrowStatus = 'available';
  } else if (totalCopies > 0 && hasBorrowed) {
    borrowStatus = 'borrowed';
  }

  return { availableCount, totalCopies, borrowStatus };
}

/**
 * Normalizes a Book record (with barcodes) into a stable API payload.
 * @param {object} book - Prisma book with optional barcodes
 * @param {{ includeBarcodes?: boolean }} [opts]
 */
function toBookDetailPayload(book, opts = {}) {
  const { includeBarcodes = true } = opts;
  const { availableCount, totalCopies, borrowStatus } = computeBorrowMeta(book.barcodes);

  const base = {
    id: book.id,
    bookId: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    description: book.description,
    summary: book.description,
    genre: book.genre,
    language: book.language,
    shelfLocation: book.shelfLocation,
    category: book.category,
    publisher: book.publisher ?? null,
    publishedAt: book.publishedAt ? book.publishedAt.toISOString() : null,
    availableCount,
    totalCopies,
    borrowStatus,
  };

  if (!includeBarcodes) {
    return base;
  }

  return {
    ...base,
    barcodes: (book.barcodes || []).map((bc) => ({
      id: bc.id,
      barcode: bc.barcode,
      status: bc.status,
      createdAt: bc.createdAt ? bc.createdAt.toISOString() : null,
    })),
  };
}

module.exports = { computeBorrowMeta, toBookDetailPayload };
