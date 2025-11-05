/* =========================================================
 * MotoAI v21 Full Developer Edition
 * ---------------------------------------------------------
 * © 2025 Motoopen — Nguyễn Tú
 * Website: https://motoopen.github.io/thuexemayohoankiem/
 * =========================================================
 * CHỨC NĂNG:
 * ✅ Đọc toàn bộ repo thông qua moto_sitemap.json
 * ✅ Học nội dung HTML/TXT và lưu cục bộ
 * ✅ Tự refresh dữ liệu sau 72 giờ
 * ✅ Hiểu câu hỏi khách hàng (xe, thời gian, giá)
 * ✅ Trả lời tự nhiên, không liệt kê bảng giá
 * ✅ Hỏi lại khi chưa hiểu
 * ✅ Lưu hội thoại 3 ngày rồi tự xoá
 * ✅ Giữ nguyên UI/UX chat nổi quen thuộc
 * =========================================================
 */

(function(){

  // Ngăn chạy lại nhiều lần nếu script được nhúng lặp
  if (window.MotoAI_v21_loaded) return;
  window.MotoAI_v21_loaded = true;

  /* ---------------------------------------------------------
   * 1. CẤU HÌNH HỆ THỐNG
   * --------------------------------------------------------- */
  const CONFIG = {
    site: "https://motoopen.github.io/thuexemayohoankiem/",
    sitemap: "https://motoopen.github.io/thuexemayohoankiem/moto_sitemap.json",
    refreshHours: 72,       // Làm mới dữ liệu sau 72 giờ
    forgetAfterDays: 3      // Xoá hội thoại sau 3 ngày
  };

  const LS_KEYS = {
    corpus: "MotoAI_v21_corpus",
    learnedAt: "MotoAI_v21_learnedAt",
    chat: "MotoAI_v21_chatHistory"
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const now = () => new Date().getTime();
  const hoursSince = t => (now() - t) / 36e5;
  const $ = s => document.querySelector(s);

  /* ---------------------------------------------------------
   * 2. TIỆN ÍCH XỬ LÝ DỮ LIỆU
   * --------------------------------------------------------- */
  const stripHTML = html => html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  function normalize(str){
    return (str||"").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9\sđ]/g," ").trim();
  }

  /* ---------------------------------------------------------
   * 3. GIAO DIỆN CHAT NỔI
   * --------------------------------------------------------- */
  const initUI = () => {
    // Nút tròn mở chat
    const btn = document.createElement("div");
    btn.id = "motoai-btn";
    btn.innerHTML = "💬";
    Object.assign(btn.style,{
      position:"fixed",bottom:"20px",right:"20px",
      width:"60px",height:"60px",borderRadius:"50%",
      background:"#0099ff",color:"#fff",fontSize:"30px",
      display:"flex",alignItems:"center",justifyContent:"center",
      cursor:"pointer",zIndex:9999
    });

    // Hộp chat chính
    const box = document.createElement("div");
    box.id="motoai-box";
    Object.assign(box.style,{
      position:"fixed",bottom:"90px",right:"20px",
      width:"320px",height:"420px",background:"#fff",
      borderRadius:"12px",boxShadow:"0 4px 12px rgba(0,0,0,.2)",
      overflow:"hidden",display:"none",flexDirection:"column",zIndex:9999
    });
    box.innerHTML = `
      <div style="background:#0099ff;color:white;padding:10px;font-weight:bold">
        Nguyễn Tú - Hỗ trợ thuê xe 🏍️
        <span id="motoai-close" style="float:right;cursor:pointer">✖</span>
      </div>
      <div id="motoai-chat" style="flex:1;overflow-y:auto;padding:10px;font-size:14px"></div>
      <div style="display:flex;border-top:1px solid #ddd">
        <input id="motoai-input" placeholder="Nhập tin nhắn..." style="flex:1;border:none;padding:10px;outline:none;font-size:14px">
        <button id="motoai-send" style="background:#0099ff;color:white;border:none;padding:10px 15px;cursor:pointer">Gửi</button>
      </div>
    `;

    document.body.append(btn,box);
    btn.onclick=()=>box.style.display=(box.style.display==="none"?"flex":"none");
    $("#motoai-close").onclick=()=>box.style.display="none";
    $("#motoai-send").onclick=()=>sendMessage();
    $("#motoai-input").addEventListener("keypress",e=>{if(e.key==="Enter")sendMessage();});
  };

  // Ghi tin nhắn lên khung chat
  const appendChat = (sender,msg)=>{
    const div=document.createElement("div");
    div.className="motoai-"+sender;
    div.style.margin="5px 0";
    div.innerHTML = `<b>${sender==="user"?"Bạn":"AI"}:</b> ${msg}`;
    $("#motoai-chat").append(div);
    $("#motoai-chat").scrollTop=$("#motoai-chat").scrollHeight;
  };

  /* ---------------------------------------------------------
   * 4. TẢI DỮ LIỆU HỌC TỪ SITEMAP
   * --------------------------------------------------------- */
  async function loadData(){
    const last=localStorage.getItem(LS_KEYS.learnedAt);
    const cache=localStorage.getItem(LS_KEYS.corpus);

    // Dữ liệu còn hạn -> dùng lại
    if(last && cache && hoursSince(+last) < CONFIG.refreshHours){
      console.log("MotoAI: sử dụng dữ liệu đã lưu.");
      return JSON.parse(cache);
    }

    appendChat("ai","⏳ Đang đọc toàn bộ nội dung từ website...");

    let links=[];
    try{
      const res=await fetch(CONFIG.sitemap);
      const js=await res.json();
      links = Object.values(js.categories).flatMap(c=>c.list);
    }catch(e){console.warn("Không tải được sitemap:",e);}

    const texts=[];
    for(const url of links){
      try{
        const t=await fetch(url);
        const h=await t.text();
        const txt=stripHTML(h);
        texts.push(txt);
        console.log("Đã đọc:",url);
        await sleep(250); // tránh spam request
      }catch(e){console.warn("Lỗi đọc:",url);}
    }

    const corpus=texts.join("\n\n");
    localStorage.setItem(LS_KEYS.corpus,JSON.stringify(corpus));
    localStorage.setItem(LS_KEYS.learnedAt,now());
    appendChat("ai","✅ Đã nạp dữ liệu học thành công.");
    return corpus;
  }

  /* ---------------------------------------------------------
   * 5. PHÂN TÍCH CÂU HỎI & TÍNH GIÁ
   * --------------------------------------------------------- */
  function detectDuration(text){
    const t=normalize(text);
    if(/thang|30 ?ngay|month/.test(t)) return {unit:"month",value:1};
    if(/tuan|7 ?ngay|week/.test(t)) return {unit:"week",value:1};
    const m=t.match(/(\d+)\s*ngay/);
    if(m) return {unit:"day",value:+m[1]};
    if(/ngay/.test(t)) return {unit:"day",value:1};
    return null;
  }

  function detectVehicle(text){
    const t=normalize(text);
    if(/vision/.test(t)) return "vision";
    if(/wave|future|blade|sirius|dream|jupiter/.test(t)) return "xe so";
    if(/lead|air|sh|vespa|grande|janus|att|ga/.test(t)) return "xe ga";
    if(/exciter|winner|con|tay|raider/.test(t)) return "xe con tay";
    if(/dien|klara|yadea|dibao/.test(t)) return "xe dien";
    return null;
  }

  function estimatePrice(vehicle, dur){
    const base = {
      "xe so":150000,
      "vision":200000,
      "xe ga":180000,
      "xe con tay":350000,
      "xe dien":170000
    }[vehicle]||180000;

    let total=base;
    if(!dur) return {text:`Giá trung bình khoảng ${base.toLocaleString()}đ / ngày.`};

    if(dur.unit==="day"){
      total=base*dur.value;
      if(dur.value>=3) total*=0.9;
      return {text:`Thuê ${vehicle} ${dur.value} ngày khoảng ${Math.round(total/1000)*1000}đ, gồm mũ bảo hiểm và giao xe tận nơi.`};
    }
    if(dur.unit==="week"){
      total=base*7*0.8;
      return {text:`Thuê ${vehicle} theo tuần khoảng ${Math.round(total/1000)*1000}đ / tuần, tiết kiệm hơn thuê lẻ.`};
    }
    if(dur.unit==="month"){
      total=base*30*0.6;
      return {text:`Thuê ${vehicle} theo tháng khoảng ${Math.round(total/1000)*1000}đ / tháng, giảm mạnh so với thuê ngày.`};
    }
    return {text:`Giá thuê ${vehicle} tuỳ thời gian, trung bình ${base.toLocaleString()}đ / ngày.`};
  }

  async function handleUserInput(text,corpus){
    const msg=normalize(text);
    const vehicle=detectVehicle(msg);
    const dur=detectDuration(msg);
    if(vehicle || dur){
      const p=estimatePrice(vehicle||"xe ga",dur);
      return p.text;
    }

    if(/thu tuc|dat coc|giay to|cccd|ho chieu|bang lai/.test(msg))
      return "Thủ tục đơn giản: chỉ cần CCCD hoặc hộ chiếu, cọc nhẹ theo loại xe. Giao xe tận nơi trong 15 phút quanh Hoàn Kiếm.";

    if(/dia chi|lien he|zalo|so dien thoai/.test(msg))
      return "Liên hệ Zalo 0942 467 674 hoặc ghé 114 Nguyễn Văn Cừ – Long Biên để xem xe trực tiếp nhé.";

    if(corpus){
      const lines=corpus.split(/\n+/).filter(x=>x.length>50);
      const found=lines.find(l=>normalize(l).includes(msg.split(" ")[0]));
      if(found) return found.slice(0,300)+"...";
    }

    return null;
  }

  /* ---------------------------------------------------------
   * 6. GỬI & NHẬN TIN NHẮN
   * --------------------------------------------------------- */
  async function sendMessage(){
    const input=$("#motoai-input");
    const text=input.value.trim();
    if(!text) return;
    appendChat("user",text);
    input.value="";
    const corpus=JSON.parse(localStorage.getItem(LS_KEYS.corpus)||"null");
    let reply = await handleUserInput(text,corpus);
    if(!reply){
      reply="Mình chưa hiểu rõ lắm, bạn nói cụ thể hơn được không ạ? Ví dụ: 'Thuê Vision 2 ngày' hoặc 'Thủ tục thuê xe'.";
    }
    appendChat("ai",reply);
    saveChat();
  }

  /* ---------------------------------------------------------
   * 7. LƯU & TỰ XOÁ HỘI THOẠI SAU 3 NGÀY
   * --------------------------------------------------------- */
  function saveChat(){
    const msgs = Array.from(document.querySelectorAll("#motoai-chat div")).map(div => div.innerText);
    localStorage.setItem(LS_KEYS.chat, JSON.stringify({ time: now(), msgs }));
  }

  function loadChat(){
    const saved = localStorage.getItem(LS_KEYS.chat);
    if(!saved) return;
    try{
      const data = JSON.parse(saved);
      if((now() - data.time) > CONFIG.forgetAfterDays * 86400000){
        localStorage.removeItem(LS_KEYS.chat);
        return;
      }
      data.msgs.forEach(line=>{
        const [prefix,...rest]=line.split(":");
        appendChat(prefix==="Bạn"?"user":"ai",rest.join(":"));
      });
    }catch(e){console.warn("Lỗi đọc chat:",e);}
  }

  /* ---------------------------------------------------------
   * 8. KHỞI ĐỘNG
   * --------------------------------------------------------- */
  window.addEventListener("DOMContentLoaded", async ()=>{
    initUI();
    loadChat();
    const corpus = await loadData();

    const saved = localStorage.getItem(LS_KEYS.chat);
    if(!saved){
      setTimeout(()=>{
        appendChat("ai","Xin chào 👋! Mình là trợ lý Nguyễn Tú. Bạn cần thuê xe loại nào – số, ga, hay điện ạ?");
      },800);
    }
  });

})();
