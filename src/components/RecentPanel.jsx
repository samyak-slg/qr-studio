import Icon from './Icon.jsx';
import { QR_TYPES, describeContent } from '../lib/qrTypes.js';
import { timeAgo } from '../lib/format.js';

const typeLabel = (id) => QR_TYPES.find((type) => type.id === id)?.label ?? id;

export default function RecentPanel({ items, onLoad, onRemove, onClear }) {
  const handleClear = () => {
    if (window.confirm('Remove all recent QR codes from this browser?')) onClear();
  };

  return (
    <section className="card recent" aria-labelledby="recent-title">
      <div className="card-head">
        <h2 id="recent-title">Recent QR codes</h2>
        {items.length > 0 && (
          <button type="button" className="btn btn-small btn-ghost" onClick={handleClear}>
            <Icon name="trash" size={16} />
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="muted">
          QR codes you download, copy or save show up here. They’re stored in this browser, so they’re still here after a
          refresh. Click one to load it back into the editor.
        </p>
      ) : (
        <ul className="recent-grid">
          {items.map((item) => {
            const summary = describeContent(item.type, item.fields);
            return (
              <li key={item.id} className="recent-item">
                <button type="button" className="recent-load" onClick={() => onLoad(item)} aria-label={`Load ${typeLabel(item.type)} QR code: ${summary}`}>
                  {item.thumbnail ? <img src={item.thumbnail} alt="" width="80" height="80" /> : <span className="recent-placeholder" />}
                  <span className="recent-type">{typeLabel(item.type)}</span>
                  <span className="recent-text" title={summary}>
                    {summary}
                  </span>
                  <span className="recent-time">{timeAgo(item.createdAt)}</span>
                </button>
                <button
                  type="button"
                  className="icon-btn recent-delete"
                  aria-label={`Delete ${typeLabel(item.type)} QR code: ${summary}`}
                  onClick={() => onRemove(item.id)}
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
