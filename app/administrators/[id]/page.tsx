"use client";

import { use } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Admin = {
  id: number | string;
  name: string;
  phone: string;
  role: string;
  createdAt: string;
  img: string;
};

export default function AdminDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const admins: Record<string, Admin> = {
    '2458': {
      id: 2458,
      name: "Istamov Xurshid Hazratqul o'g'li",
      phone: "+998 99 999 99 99",
      role: 'Administrator',
      createdAt: '2023-04-09 14:21:44',
      img: '/icon.svg'
    },
    '3652': {
      id: 3652,
      name: "Istamov Xurshid Hazratqul o'g'li",
      phone: "+998 99 999 99 99",
      role: 'Administrator',
      createdAt: '2023-04-09 14:21:44',
      img: '/icon.svg'
    }
  };

  const a = admins[id] || { id, name: 'Unknown', phone: '-', role: '-', createdAt: '-', img: '/icon.svg' };

  return (
    <div style={{padding:28, background:'#F3F4F6', minHeight:'100vh'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:'#0f1724'}}>Administrator tafsilotlari</div>
          <div style={{color:'#64748b'}}>Foydalanuvchilar › Administratorlar › {a.name}</div>
        </div>
        <div>
          <button onClick={() => router.push('/administrators')} style={{background:'#fff',border:'1px solid #e6e9ee',padding:'8px 12px',borderRadius:8}}>Orqaga</button>
        </div>
      </div>

      <div style={{display:'flex',gap:24,alignItems:'center'}}>
        <div style={{width:160, height:160, borderRadius:16, background:'#fff', display:'flex',alignItems:'center',justifyContent:'center', boxShadow:'0 8px 24px rgba(2,6,23,0.06)'}}>
          <Image src={a.img} alt={a.name} width={120} height={120} priority />
        </div>

        <div style={{background:'#fff',padding:20,borderRadius:12,boxShadow:'0 8px 24px rgba(2,6,23,0.06)', flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:'#0f1724'}}>{a.name}</div>
              <div style={{color:'#64748b',marginTop:6}}>{a.role}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button style={{background:'#fff',border:'1px solid #e6e9ee',padding:8,borderRadius:8}}>✎</button>
              <button style={{background:'#fff',border:'1px solid #e6e9ee',padding:8,borderRadius:8}}>🗑</button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:18}}>
            <div style={{padding:12,borderRadius:8,background:'#fafafa'}}>
              <div style={{color:'#64748b',fontSize:13}}>Telefon</div>
              <div style={{fontWeight:700,marginTop:6}}>{a.phone}</div>
            </div>

            <div style={{padding:12,borderRadius:8,background:'#fafafa'}}>
              <div style={{color:'#64748b',fontSize:13}}>Yaratilgan vaqt</div>
              <div style={{fontWeight:700,marginTop:6}}>{a.createdAt}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
