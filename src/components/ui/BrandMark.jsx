export function BrandMark({ size = 32, className = '' }) {
 return <svg width={size * 1.35} height={size} viewBox="260 355 645 450" role="img" aria-label="Skillfy logo" className={`skillfy-logo ${className}`}><image href="/skillfy-logo.png" width="1057" height="1008" /></svg>;
}
export function BrandWordmark({ size = 28, className = '' }) {
 return <span className={`skillfy-wordmark ${className}`} style={{fontSize:size}}><BrandMark size={size * 1.15}/><span>Skill<span className="skillfy-brand-accent">fy</span></span></span>;
}
