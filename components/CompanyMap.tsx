
import React, { useEffect, useRef, useState } from 'react';
import { CompanyData, isAcademicEntity } from '../types';
import { MapPin, AlertCircle, Loader2, Search, ExternalLink } from 'lucide-react';

interface CompanyMapProps {
  companies: CompanyData[];
}

const CompanyMap: React.FC<CompanyMapProps> = ({ companies }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for Leaflet loading
  useEffect(() => {
    let interval: any;
    let timeout: any;

    const checkLeaflet = () => {
      const L = (window as any).L;
      // Wait for BOTH Leaflet and the MarkerCluster plugin to be available
      if (L && (L.markerClusterGroup || L.MarkerClusterGroup)) {
        setIsLeafletLoaded(true);
        clearInterval(interval);
        clearTimeout(timeout);
      }
    };

    const L = (window as any).L;
    if (L && (L.markerClusterGroup || L.MarkerClusterGroup)) {
      setIsLeafletLoaded(true);
    } else {
      interval = setInterval(checkLeaflet, 100);
      
      timeout = setTimeout(() => {
        clearInterval(interval);
        if ((window as any).L) {
          // Fallback if plugin fails to load after 5 seconds
          setIsLeafletLoaded(true);
        } else {
          setError("Leaflet failed to load.");
        }
      }, 5000);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Helper to escape HTML for safety
  const escapeHtml = (text: string) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    console.log("Leaflet L object:", L);

    if (!mapInstanceRef.current) {
      console.log("Attempting to initialize map...");
      try {
        const map = L.map(mapContainerRef.current).setView([20, 0], 2);
        console.log("Map initialized.");
        
        // CartoDB Voyager (Clean, Professional, Reliable)
        // Switch from Google Maps to CartoDB to prevent tile rendering issues/grey blocks
        const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        // Google Hybrid as secondary option (Satellite)
        const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        });

        // Add default layer
        cartoVoyager.addTo(map);
        console.log("CartoDB layer added.");

        // Add Layer Control to toggle between Map and Satellite
        L.control.layers({
            "Map (Clean)": cartoVoyager,
            "Satellite": googleHybrid
        }, undefined, { position: 'bottomright' }).addTo(map);
        
        mapInstanceRef.current = map;
      } catch (err: any) {
        console.error("Error initializing map:", err);
        setError("Failed to initialize map: " + err.message);
      }
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Force resize calculation to prevent grey tiles
    setTimeout(() => {
       map.invalidateSize();
    }, 200);

    // --- CLUSTERING LOGIC ---
    // If a cluster group exists, remove it to clear previous markers
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    // Check if MarkerCluster plugin is available
    const hasClusterPlugin = !!(L.markerClusterGroup || L.MarkerClusterGroup);
    console.log("Has MarkerCluster plugin:", hasClusterPlugin);
    
    let markerLayer: any = null;

    if (hasClusterPlugin) {
      const clusterGroupFunction = L.markerClusterGroup || L.MarkerClusterGroup;
      console.log("Creating marker cluster group");
      markerLayer = clusterGroupFunction({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // Custom Styled Clusters
        iconCreateFunction: function(cluster: any) {
          console.log("Creating cluster icon");
          const childCount = cluster.getChildCount();
          
          let sizeClass = '';
          let sizeDim = 40;
          
          if (childCount < 10) {
            sizeClass = 'bg-blue-100 text-blue-700 border-blue-300 shadow-blue-200';
            sizeDim = 32;
          } else if (childCount < 100) {
            sizeClass = 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-indigo-200';
            sizeDim = 40;
          } else {
            sizeClass = 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-emerald-200';
            sizeDim = 48;
          }

          return L.divIcon({ 
            html: `<div style="width: ${sizeDim}px; height: ${sizeDim}px;" class="flex items-center justify-center rounded-full border-4 font-black shadow-lg ${sizeClass} text-xs transition-transform hover:scale-110">${childCount}</div>`, 
            className: 'marker-cluster-custom', 
            iconSize: L.point(sizeDim, sizeDim) 
          });
        }
      });
    } else {
      console.log("MarkerCluster plugin not found, using LayerGroup");
      // Fallback LayerGroup if plugin missing
      markerLayer = L.layerGroup();
    }

    const bounds = L.latLngBounds([]);
    let hasMarkers = false;
    const markersToAdd: any[] = [];
    console.log(`Number of companies: ${companies.length}`);

    // --- Helper for List Generation in Popups ---
    const generateListHTML = (items: any[], type: 'pipeline' | 'approved' | 'pubs' | 'faculty', companyName: string) => {
        if (!items || items.length === 0) return '<div style="font-size:9px;color:#94a3b8;font-style:italic;">No data available</div>';
        
        // Take top 5
        const topItems = items.slice(0, 5);
        
        return topItems.map((item: any) => {
            if (type === 'pipeline') {
                const drugName = item.drugName || 'Unknown';
                const ctTerm = encodeURIComponent(drugName);
                const ctUrl = item.nctId 
                    ? `https://clinicaltrials.gov/study/${item.nctId}` 
                    : `https://clinicaltrials.gov/search?term=${ctTerm}`;
                
                const googleTerm = encodeURIComponent(`${drugName} ${companyName} clinical trial`);
                const googleUrl = `https://www.google.com/search?q=${googleTerm}`;

                const pubmedTerm = encodeURIComponent(`${drugName} ${companyName}`);
                const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${pubmedTerm}`;

                return `
                <div style="margin-bottom:6px; padding:6px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size:11px; font-weight:700; color:#1e293b; margin-bottom:4px; line-height:1.2;">
                        ${escapeHtml(drugName)}
                    </div>
                    <div style="display:flex; gap:4px;">
                        <a href="${ctUrl}" target="_blank" title="Official Registry" style="flex:1; text-align:center; font-size:9px; padding:3px 0; background:white; border:1px solid #cbd5e1; border-radius:4px; text-decoration:none; color:#2563eb; font-weight:600; display:flex; align-items:center; justify-content:center; gap:2px;">
                           Registry
                        </a>
                        <a href="${pubmedUrl}" target="_blank" title="Scientific Literature" style="flex:1; text-align:center; font-size:9px; padding:3px 0; background:white; border:1px solid #cbd5e1; border-radius:4px; text-decoration:none; color:#059669; font-weight:600; display:flex; align-items:center; justify-content:center; gap:2px;">
                           PubMed
                        </a>
                        <a href="${googleUrl}" target="_blank" title="Web Search" style="flex:1; text-align:center; font-size:9px; padding:3px 0; background:white; border:1px solid #cbd5e1; border-radius:4px; text-decoration:none; color:#475569; font-weight:600; display:flex; align-items:center; justify-content:center; gap:2px;">
                           Google
                        </a>
                    </div>
                </div>`;
            }

            let label = '';
            let url = '';
            
            if (type === 'approved') {
                label = typeof item === 'string' ? item : 'Unknown';
                const clean = label.split('(')[0].trim();
                url = `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(clean)}`;
            } else if (type === 'pubs') {
                label = item.title || 'Untitled';
                // Switch to Google Scholar for better title matching than PubMed's strict search
                url = item.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(label)}`;
            } else if (type === 'faculty') {
                label = item.name || 'Unknown';
                url = `https://www.google.com/search?q=${encodeURIComponent(label + " " + companyName)}`;
            }

            return `
                <a href="${url}" target="_blank" style="display:block; color:#2563eb; text-decoration:none; font-size:9px; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:2px 4px; background:#f8fafc; border-radius:3px; border:1px solid #e2e8f0;">
                   ${escapeHtml(label)}
                </a>
            `;
        }).join('');
    };

    companies.forEach(company => {
      const lat = Number(company.contact.latitude);
      const lng = Number(company.contact.longitude);

      console.log(`Processing company: ${company.name}, Lat: ${lat}, Lng: ${lng}`);

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        // Jitter to prevent exact overlap
        const jitter = 0.005; 
        const jLat = lat + (Math.random() - 0.5) * jitter;
        const jLng = lng + (Math.random() - 0.5) * jitter;
        
        console.log(`Adding marker for ${company.name} at [${jLat}, ${jLng}]`);
        
        const website = company.contact.website;
        let safeUrl = '';
        if (website && website.toLowerCase() !== 'n/a') {
            safeUrl = website.startsWith('http') ? website : `https://${website}`;
        }

        const isAcademic = isAcademicEntity(company);
        const markerColor = '#3b82f6'; // blue-500

        // Define Inner Icon Paths
        let iconPath = '';
        if (isAcademic) {
            iconPath = '<path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5"></path>';
        } else {
            iconPath = '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path>';
        }

        const stat1Label = isAcademic ? 'Pubs' : 'Pipeline';
        const stat1Count = isAcademic ? company.scientificPublications.length : company.pipeline.length;
        const stat2Label = isAcademic ? 'Faculty' : 'Approved';
        const stat2Count = isAcademic ? (company.keyResearchers?.length || 0) : company.keyApprovedDrugs.length;
        
        // Use full sector name, do not split by comma, to match requirement
        const safeSector = company.sector || 'Uncategorized';

        // Lists for tooltips
        const list1HTML = generateListHTML(
            isAcademic ? company.scientificPublications : company.pipeline,
            isAcademic ? 'pubs' : 'pipeline',
            company.name
        );
        const list2HTML = generateListHTML(
            isAcademic ? company.keyResearchers : company.keyApprovedDrugs,
            isAcademic ? 'faculty' : 'approved',
            company.name
        );

        // Minimal HTML for high performance popup rendering with hover tooltips
        const popupContent = `
            <div style="font-family: 'Inter', sans-serif; min-width: 240px; padding: 2px;">
              <div style="margin-bottom: 6px;">
                 <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${escapeHtml(company.name)}</div>
                 <div style="color: ${markerColor}; font-size: 10px; font-weight: 700; text-transform: uppercase;">${escapeHtml(safeSector)}</div>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${escapeHtml(company.contact.hqAddress || 'Location N/A')}</div>
              ${safeUrl ? `<a href="${safeUrl}" target="_blank" style="display:block; color: ${markerColor}; font-size: 11px; font-weight: 600; text-decoration: none; margin-bottom: 8px;">Visit Website &rarr;</a>` : ''}
              <div style="display: flex; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                 <div style="flex:1; text-align: center; background: #f8fafc; border-radius: 4px; padding: 4px; position:relative; cursor:pointer;" onclick="var t = this.querySelector('.tooltip'); t.style.display = t.style.display === 'block' ? 'none' : 'block'; event.stopPropagation();">
                    <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">${stat1Label}</div>
                    <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${stat1Count}</div>
                    <div class="tooltip" style="display:none; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); background:white; border:1px solid #cbd5e1; border-radius:6px; padding:6px; width:220px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:9999; margin-bottom:8px; text-align:left;" onclick="event.stopPropagation();">
                       <div style="font-size:9px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">Top Items</div>
                       ${list1HTML}
                       <div style="position:absolute; top:100%; left:50%; margin-left:-4px; border-width:4px; border-style:solid; border-color:#cbd5e1 transparent transparent transparent;"></div>
                    </div>
                 </div>
                 <div style="flex:1; text-align: center; background: ${isAcademic ? '#f0fdf4' : '#eff6ff'}; border-radius: 4px; padding: 4px; position:relative; cursor:pointer;" onclick="var t = this.querySelector('.tooltip'); t.style.display = t.style.display === 'block' ? 'none' : 'block'; event.stopPropagation();">
                    <div style="font-size: 9px; color: ${isAcademic ? '#15803d' : '#1e40af'}; font-weight: 700; text-transform: uppercase;">${stat2Label}</div>
                    <div style="font-weight: 800; font-size: 14px; color: ${isAcademic ? '#166534' : '#1e3a8a'};">${stat2Count}</div>
                    <div class="tooltip" style="display:none; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); background:white; border:1px solid #cbd5e1; border-radius:6px; padding:6px; width:220px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:9999; margin-bottom:8px; text-align:left;" onclick="event.stopPropagation();">
                       <div style="font-size:9px; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:2px;">Top Items</div>
                       ${list2HTML}
                       <div style="position:absolute; top:100%; left:50%; margin-left:-4px; border-width:4px; border-style:solid; border-color:#cbd5e1 transparent transparent transparent;"></div>
                    </div>
                 </div>
              </div>
            </div>
        `;

        const customIcon = L.divIcon({
          className: '', 
          html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${markerColor}"></path>
              <g transform="translate(6, 4) scale(0.5)" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                ${iconPath}
              </g>
          </svg>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([jLat, jLng], { icon: customIcon }).bindPopup(popupContent);
        markersToAdd.push(marker);
        bounds.extend([jLat, jLng]);
        hasMarkers = true;
      }
    });

    if (hasClusterPlugin) {
      markerLayer.addLayers(markersToAdd);
    } else {
      markersToAdd.forEach(m => m.addTo(markerLayer));
    }

    map.addLayer(markerLayer);
    clusterGroupRef.current = markerLayer;

    if (hasMarkers) {
      // Small timeout to ensure layout is ready before fitting bounds
      setTimeout(() => {
         try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 }); } catch(e) {}
      }, 200);
    } else {
      map.setView([20, 0], 2);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

  }, [isLeafletLoaded, companies]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    
    // Also listen to window resize as a fallback
    const handleResize = () => {
       if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isLeafletLoaded]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 bg-slate-100 group">
      {!isLeafletLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading map...</span>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 text-red-500 p-4 text-center">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 w-full h-full" 
        style={{ minHeight: '400px', height: '100%', width: '100%' }} 
      />
      
      <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow text-xs font-medium text-slate-600 border border-slate-200 pointer-events-none">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-blue-600" />
          Showing {companies.filter(c => c.contact.latitude).length} locations
        </span>
      </div>
    </div>
  );
};

export default CompanyMap;
