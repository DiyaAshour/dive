export default function SearchLoading(){
  return <main className="searchExperience" aria-busy="true">
    <section className="searchSummaryBar"><div className="shell"><div className="searchSummaryForm" style={{minHeight:84}}/></div></section>
    <section className="shell searchLayout">
      <aside className="searchFilters"><div className="filterHeading"><strong>Filters</strong></div>{Array.from({length:5}).map((_,i)=><div key={i} className="filterBlock"><div style={{height:16,borderRadius:8,background:"#ece8df",width:i%2?"70%":"90%"}}/></div>)}</aside>
      <div className="searchResults">
        <div className="searchResultsHead"><div><span className="eyebrow">HandMeKey</span><h1>Finding your stay</h1><p>Hotel content appears first. Live prices are being checked.</p></div></div>
        <div className="searchResultList">{Array.from({length:4}).map((_,i)=><article className="premiumResultCard" key={i} style={{minHeight:220,opacity:.72}}><div className="premiumResultMedia" style={{background:"#ece8df"}}/><div className="premiumResultContent"><div className="premiumResultMain"><div style={{height:14,width:"35%",borderRadius:7,background:"#ece8df",marginBottom:14}}/><div style={{height:26,width:"68%",borderRadius:8,background:"#e4dfd5",marginBottom:18}}/><div style={{height:14,width:"82%",borderRadius:7,background:"#efebe4"}}/></div><div className="premiumResultPrice"><span>Checking live price…</span><div style={{height:28,width:120,borderRadius:8,background:"#e4dfd5"}}/></div></div></article>)}</div>
      </div>
    </section>
  </main>;
}
