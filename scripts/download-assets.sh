#!/bin/sh
# Downloads image/video assets used by the page into assets/images
set -e
B=https://e-moto.vn
D=assets/images
get(){ curl -sfL -A "Mozilla/5.0" "$1" -o "$2" && echo "ok $2" || echo "FAIL $1"; }
for f in logo.png sub-logo.png VN-icon.png US-icon.png russia.png japan.png china.png KO-icon.png video.webm bg-video.jpg zalo.png zalo-icon.png kakaotalk.png hotline-ico.png bg-home-cate.jpg marker-icon.png marker-icon-red.png; do get $B/images/$f $D/$f & done; wait
for f in intro-xe-dien-vinfast.jpg intro-xe-dien-vinfast-1.jpg intro-xe-dien-vinfast-2.jpg ZGoo_white_electric.png Honda_ICONe.png; do get $B/images/hinh_anh/$f $D/hinh_anh/$f & done; wait
get $B/images/san_pham/WHS.jpg $D/san_pham/WHS.jpg & get $B/images/san_pham/img-evo-white.jpg $D/san_pham/img-evo-white.jpg & get $B/images/san_pham/img-evo-yellow.jpg $D/san_pham/img-evo-yellow.jpg & get $B/images/san_pham/evo-max/max-white.jpg $D/san_pham/max-white.jpg & wait
for f in xe-may-dien-1.jpg xe-may-dien-4.jpg xe-may-dien-5.jpg xe-may-dien-6.jpg xe-may-dien-7.jpg xe-may-dien-8.jpg xem-may-dien-2.jpg xem-may-dien-3.jpg ly-do.jpg; do get $B/images/thu_vien/$f $D/thu_vien/$f & done; wait
for f in zonemedia.png zoneluxury.png zonehome.png vinfast.png; do get $B/images/doi_tac/$f $D/doi_tac/$f & done; wait
for f in Electric_Motorbike_rental_Emoto.jpg Electric_Motorbike_rental_1.jpg Cho_thue_xe_may_dien_Da_Nang_-_Electric_Motorbike_Rental.webp Cho_thue_xe_may_dien_da_nang_EMOTO.webp; do get $B/images/hinh_anh/$f $D/news/$f & done; wait
for f in favicon.png favicon-32x32.png favicon-16x16.png apple-touch-icon.png; do get $B/$f $D/$f & done; wait
