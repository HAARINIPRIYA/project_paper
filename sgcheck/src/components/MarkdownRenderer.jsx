/**
 * MarkdownRenderer — renders AI bot responses with proper styling.
 * Uses react-markdown with remark-gfm for tables, lists, and formatting.
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// ---------------------------------------------------------------------------
// Custom components for each markdown element
// ---------------------------------------------------------------------------

const components = {
  // Headings
  h2: ({ children, ...props }) => (
    <h2
      style={{
        fontSize: "15px",
        fontWeight: 700,
        margin: "16px 0 8px",
        color: "var(--text-primary)",
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => {
    const text = typeof children === 'string' ? children : ''
    const isPredictionHeader = text.includes('📈 Predicted Yield')
    return (
      <h3
        style={{
          fontSize: isPredictionHeader ? '17px' : '13px',
          fontWeight: isPredictionHeader ? 700 : 600,
          margin: '16px 0 4px',
          paddingBottom: isPredictionHeader ? '4px' : 0,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          borderBottom: isPredictionHeader ? '1px solid rgba(0,214,143,0.15)' : undefined,
        }}
        {...props}
      >
        {children}
      </h3>
    )
  },

  // Paragraphs
  p: ({ children, ...props }) => (
    <p
      style={{
        margin: "0 0 6px",
        fontSize: "13px",
        lineHeight: 1.6,
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </p>
  ),

  // Bold — with special glowing highlight for yield prediction values
  strong: ({ children, ...props }) => {
    const text = typeof children === 'string' ? children : ''
    const isYieldValue = text.includes('Quintal')
    if (isYieldValue) {
      // Yield prediction value — make it HUGE, green, and glowing
      return (
        <strong
          style={{
            display: 'inline-block',
            fontSize: '30px',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: '#00F5A0',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            padding: '10px 0 6px',
            textShadow: '0 0 30px rgba(0,214,143,0.5), 0 0 60px rgba(0,214,143,0.2)',
          }}
          {...props}
        >
          {children}
        </strong>
      )
    }
    return (
      <strong
        style={{
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
        {...props}
      >
        {children}
      </strong>
    )
  },

  // Lists
  ul: ({ children, ...props }) => (
    <ul
      style={{
        margin: "4px 0 8px",
        paddingLeft: "18px",
        fontSize: "13px",
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      style={{
        margin: "4px 0 8px",
        paddingLeft: "18px",
        fontSize: "13px",
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li style={{ marginBottom: "2px" }} {...props}>
      {children}
    </li>
  ),

  // Blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        margin: "8px 0",
        padding: "6px 10px",
        borderLeft: "3px solid var(--accent-green)",
        background: "var(--accent-green-bg)",
        borderRadius: "0 4px 4px 0",
        fontSize: "12px",
        lineHeight: 1.5,
        color: "var(--text-secondary)",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Inline code
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code
          style={{
            background: "var(--bg-deep)",
            padding: "1px 5px",
            borderRadius: "3px",
            fontSize: "12px",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--accent-green)",
          }}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <pre
        style={{
          background: "var(--bg-deep)",
          padding: "10px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          overflow: "auto",
          margin: "8px 0",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <code {...props}>{children}</code>
      </pre>
    )
  },

  // Tables (GFM)
  table: ({ children, ...props }) => (
    <div style={{ overflow: "auto", margin: "8px 0" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr
      style={{
        borderBottom: "1px solid var(--border-subtle)",
      }}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        padding: "6px 8px",
        fontWeight: 600,
        textAlign: props.style?.textAlign || "left",
        background: "var(--bg-deep)",
        color: "var(--text-primary)",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        padding: "5px 8px",
        color: "var(--text-primary)",
        textAlign: props.style?.textAlign || "left",
        fontVariantNumeric: "tabular-nums",
      }}
      {...props}
    >
      {children}
    </td>
  ),

  // Horizontal rules (separators)
  hr: ({ ...props }) => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border-subtle)",
        margin: "12px 0",
      }}
      {...props}
    />
  ),

  // Links
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent-green)",
        textDecoration: "underline",
        textUnderlineOffset: "2px",
      }}
      {...props}
    >
      {children}
    </a>
  ),

  // Break / newline
  br: ({ ...props }) => <br style={{ lineHeight: 1.8 }} {...props} />,
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarkdownRenderer({ content }) {
  if (!content) return null

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
