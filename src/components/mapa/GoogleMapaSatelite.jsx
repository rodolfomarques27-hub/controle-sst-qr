import React, { useEffect, useRef, useState } from "react";

let carregamentoGoogleMaps;

function carregarGoogleMaps(chave) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (carregamentoGoogleMaps) return carregamentoGoogleMaps;
  carregamentoGoogleMaps = new Promise((resolve, reject) => {
    const callback = `safeScanGoogleMaps${Date.now()}`;
    window[callback] = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(chave)}&callback=${callback}&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Não foi possível carregar o Google Maps."));
    document.head.appendChild(script);
  });
  return carregamentoGoogleMaps;
}

export function GoogleMapaSatelite({ apiKey, latitude, longitude, zoom = 19 }) {
  const mapaRef = useRef(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    carregarGoogleMaps(apiKey).then((maps) => {
      if (!ativo || !mapaRef.current) return;
      new maps.Map(mapaRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom,
        mapTypeId: "satellite",
        streetViewControl: false,
        mapTypeControl: false,
      });
    }).catch((falha) => ativo && setErro(falha.message));
    return () => { ativo = false; };
  }, [apiKey, latitude, longitude, zoom]);

  if (erro) return <div className="grid h-[560px] place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">{erro}</div>;
  return <div ref={mapaRef} className="h-[560px] min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100" />;
}
