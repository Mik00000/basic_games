import React from "react";
import { Link } from "react-router-dom";

export const Partners = () => {
  const icons = [
    {
      pathName: "logos_airbnb.svg",
      url: "https://www.airbnb.com",
    },
    {
      pathName: "logos_android-icon.svg",
      url: "https://www.android.com",
    },
    {
      pathName: "logos_apiary.svg",
      url: "https://apiary.io/",
    },
    {
      pathName: "logos_apple-app-store.svg",
      url: "https://www.apple.com/app-store/",
    },
    {
      pathName: "logos_basecamp.svg",
      url: "https://basecamp.com",
    },
    {
      pathName: "logos_ibm.svg",
      url: "https://www.ibm.com",
    },
  ];

  return (
    <section className="partners">
      <div className="heading">
        <h1>Partners</h1>
        <h2>
        We focus on ergonomics and meeting you where you work. 
        It's only a keystroke away.
        </h2>
      </div>
      <ul className="icons">
        {icons.map((icon) => (
          <li>
            <Link to={icon.url} key={icon.pathName}>
              <img
                src={require(`../assets/icons/${icon.pathName}`)}
                draggable="false"
                alt={icon.pathName}
              />
            </Link>
          </li>
        ))}
      </ul>
      <div className="btn">
        <Link to="/"><button>All Partners</button></Link>
      </div>
    </section>
  );
};
