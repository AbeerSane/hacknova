export default function UserAvatar({
 image,
 name,
 className = "",
 imageClassName = "",
 fallbackIconClassName = "fa-solid fa-user"
}) {
 const rootClassName = `user-avatar ${className}`.trim();
 const imgClassName = `user-avatar-image ${imageClassName}`.trim();

 return (
  <span className={rootClassName} aria-hidden="true">
   {image ? (
    <img src={image} alt={name ? `${name} profile` : "Profile"} className={imgClassName} />
   ) : (
    <i className={fallbackIconClassName}></i>
   )}
  </span>
 );
}