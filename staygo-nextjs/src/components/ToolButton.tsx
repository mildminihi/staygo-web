import type { Tool } from '@/data/tools';

export default function ToolButton({ tool, showDescription = false }: { tool: Tool; showDescription?: boolean }) {
  return (
    <a href={tool.href} className="tool-button">
      <div className="tool-icon">{tool.icon}</div>
      {tool.isNew && <span className="tool-new">ใหม่</span>}
      <span className="tool-label">{tool.label}</span>
      {showDescription && <span className="tool-description">{tool.description}</span>}
    </a>
  );
}
