import logoImage from "../assets/logo123.jpeg";

export default function BrandLogo({
 className = "",
 logoClassName = "",
 titleClassName = "",
 showAccent = true
}) {
 return (
  <span className={`brand-lockup ${className}`.trim()}>
   <img src={logoImage} alt="HealthApp logo" className={`brand-logo ${logoClassName}`.trim()} />
   <span className={`brand-wordmark ${titleClassName}`.trim()}>
    HealthApp
    {showAccent ? <> <span className="brand-accent">Care+</span></> : null}
   </span>
  </span>
 );
}