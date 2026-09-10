import {CustomerHeader} from "@/components/customer-header";

const pulse={background:"linear-gradient(90deg,rgba(15,35,58,.06),rgba(15,35,58,.12),rgba(15,35,58,.06))",backgroundSize:"220% 100%",borderRadius:"999px"} as const;
const block={background:"rgba(15,35,58,.065)",borderRadius:"14px"} as const;

function Line({width,height=12}:{width:string;height?:number}){
  return <span style={{...pulse,display:"block",width,height}}/>;
}

export default function NuiteeHotelLoading() {
  return <main className="hotelExperience">
    <CustomerHeader/>
    <section className="shell hotelDetailSection" aria-busy="true" aria-label="جاري تجهيز الفندق">
      <div className="premiumHotelHead" aria-hidden="true">
        <div style={{display:"grid",gap:12,width:"100%"}}>
          <div style={{display:"flex",gap:8,justifyContent:"flex-start"}}><Line width="92px" height={26}/><Line width="64px" height={26}/></div>
          <Line width="42%" height={38}/>
          <Line width="56%"/>
          <div style={{display:"flex",gap:10,marginTop:8}}><Line width="86px" height={34}/><Line width="86px" height={34}/></div>
        </div>
      </div>

      <div className="premiumGallery" style={{minHeight:360,opacity:.72}} aria-hidden="true">
        {Array.from({length:5},(_,index)=><div key={index} className={`galleryPhoto${index+1}`} style={block}/>) }
      </div>

      <div className="hotelTrustBar" aria-hidden="true" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
        {Array.from({length:3},(_,index)=><div key={index} style={{...block,minHeight:64,padding:14,display:"grid",gap:8}}><Line width="45%"/><Line width="72%" height={9}/></div>)}
      </div>

      <section aria-hidden="true" style={{...block,padding:22,display:"grid",gap:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center"}}><div style={{display:"grid",gap:10,flex:1}}><Line width="150px" height={24}/><Line width="260px"/></div><Line width="72px" height={54}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:16}}>
          {["النظافة","الفريق والخدمة","الموقع","الراحة","المرافق","القيمة مقابل السعر"].map((label,index)=><div key={label} style={{display:"grid",gap:7}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{fontSize:13,opacity:.55}}>{label}</span><Line width="32px" height={10}/></div><div style={{height:7,background:"rgba(15,35,58,.08)",borderRadius:99,overflow:"hidden"}}><span style={{display:"block",width:`${48+index*7}%`,height:"100%",background:"rgba(15,35,58,.12)",borderRadius:99}}/></div></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>{Array.from({length:2},(_,index)=><div key={index} style={{background:"rgba(255,255,255,.55)",border:"1px solid rgba(15,35,58,.07)",borderRadius:14,padding:16,display:"grid",gap:10}}><Line width="35%"/><Line width="94%"/><Line width="78%"/></div>)}</div>
      </section>

      <div className="availabilityCard" style={{minHeight:116}} aria-hidden="true">
        <div style={{display:"grid",gap:10,width:"100%"}}><Line width="120px" height={10}/><Line width="34%" height={25}/><Line width="58%"/></div>
      </div>

      <div className="roomOfferList" aria-hidden="true">
        {Array.from({length:2},(_,index)=><article className="roomOfferCard" key={index} style={{minHeight:230}}>
          <section className="publicRoomProduct">
            <div className="publicRoomMedia" style={block}/>
            <div className="publicRoomContent" style={{display:"grid",gap:12,alignContent:"center"}}><Line width="58px" height={9}/><Line width="62%" height={24}/><div style={{display:"flex",gap:8}}><Line width="78px" height={25}/><Line width="96px" height={25}/></div><Line width="45%"/><Line width="30%" height={28}/></div>
          </section>
        </article>)}
      </div>
    </section>
  </main>;
}
