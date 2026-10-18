const RAW = {
  "Uttar Pradesh": "Lucknow,Kanpur,Ghaziabad,Agra,Varanasi,Meerut,Prayagraj,Bareilly,Aligarh,Moradabad,Saharanpur,Gorakhpur,Noida,Greater Noida,Firozabad,Jhansi,Muzaffarnagar,Mathura,Ayodhya,Rampur,Shahjahanpur,Farrukhabad,Hapur,Etawah,Mirzapur,Bulandshahr,Sambhal,Amroha,Hardoi,Fatehpur,Raebareli,Orai,Sitapur,Bahraich,Modinagar,Unnao,Jaunpur,Lakhimpur Kheri,Hathras,Banda,Pilibhit,Barabanki,Mainpuri,Budaun,Sultanpur,Azamgarh,Bijnor,Basti,Ballia,Deoria,Gonda,Kasganj",
  "Haryana": "Faridabad,Gurugram,Panipat,Ambala,Yamunanagar,Rohtak,Hisar,Karnal,Sonipat,Panchkula,Bhiwani,Sirsa,Bahadurgarh,Jind,Thanesar,Kaithal,Rewari,Palwal,Fatehabad,Jhajjar,Narnaul,Hansi,Charkhi Dadri,Mahendragarh,Kurukshetra,Nuh,Dharuhera",
  "Delhi": "Delhi,New Delhi",
  "Rajasthan": "Jaipur,Jodhpur,Kota,Bikaner,Ajmer,Udaipur,Bhilwara,Alwar,Bharatpur,Sikar,Pali,Sri Ganganagar,Kishangarh,Tonk,Beawar,Hanumangarh,Dholpur,Gangapur City,Sawai Madhopur,Churu,Jhunjhunu,Bundi,Barmer,Chittorgarh,Banswara,Jaisalmer,Nagaur,Bhiwadi,Neemrana",
  "Punjab": "Ludhiana,Amritsar,Jalandhar,Patiala,Bathinda,Mohali,Pathankot,Hoshiarpur,Batala,Moga,Malerkotla,Khanna,Phagwara,Muktsar,Barnala,Firozpur,Kapurthala,Zirakpur,Rajpura,Sangrur,Abohar,Fazilka,Gurdaspur,Rupnagar",
  "Chandigarh": "Chandigarh",
  "Himachal Pradesh": "Shimla,Dharamshala,Solan,Mandi,Kullu,Manali,Baddi,Una,Hamirpur,Palampur,Nahan,Bilaspur",
  "Uttarakhand": "Dehradun,Haridwar,Roorkee,Haldwani,Rudrapur,Kashipur,Rishikesh,Nainital,Pithoragarh,Almora,Mussoorie,Kotdwar",
  "Jammu and Kashmir": "Srinagar,Jammu,Anantnag,Baramulla,Sopore,Kathua,Udhampur",
  "Ladakh": "Leh,Kargil",
  "Madhya Pradesh": "Indore,Bhopal,Jabalpur,Gwalior,Ujjain,Sagar,Dewas,Satna,Ratlam,Rewa,Katni,Singrauli,Burhanpur,Khandwa,Morena,Bhind,Chhindwara,Guna,Shivpuri,Vidisha,Damoh,Mandsaur,Neemuch,Hoshangabad,Itarsi,Sehore,Betul,Seoni,Pithampur",
  "Chhattisgarh": "Raipur,Bhilai,Bilaspur,Korba,Durg,Rajnandgaon,Raigarh,Jagdalpur,Ambikapur",
  "Bihar": "Patna,Gaya,Bhagalpur,Muzaffarpur,Purnia,Darbhanga,Bihar Sharif,Arrah,Begusarai,Katihar,Munger,Chhapra,Danapur,Bettiah,Saharsa,Hajipur,Sasaram,Dehri,Siwan,Motihari,Nawada,Bagaha,Buxar,Kishanganj,Sitamarhi,Jamalpur,Jehanabad",
  "Jharkhand": "Ranchi,Jamshedpur,Dhanbad,Bokaro,Deoghar,Phusro,Hazaribagh,Giridih,Ramgarh,Medininagar,Chirkunda,Jhumri Telaiya,Sahibganj",
  "West Bengal": "Kolkata,Howrah,Durgapur,Asansol,Siliguri,Bardhaman,Malda,Baharampur,Habra,Kharagpur,Shantipur,Dankuni,Ranaghat,Haldia,Raiganj,Krishnanagar,Nabadwip,Medinipur,Jalpaiguri,Balurghat,Basirhat,Bankura,Chandannagar,Darjeeling,Cooch Behar,Barasat,Bidhannagar",
  "Odisha": "Bhubaneswar,Cuttack,Rourkela,Berhampur,Sambalpur,Puri,Balasore,Bhadrak,Baripada,Jharsuguda,Jeypore,Angul",
  "Assam": "Guwahati,Silchar,Dibrugarh,Nagaon,Tinsukia,Jorhat,Bongaigaon,Dhubri,Diphu,North Lakhimpur,Tezpur,Karimganj,Sivasagar,Goalpara",
  "Meghalaya": "Shillong,Tura",
  "Manipur": "Imphal",
  "Mizoram": "Aizawl",
  "Nagaland": "Kohima,Dimapur",
  "Tripura": "Agartala",
  "Arunachal Pradesh": "Itanagar",
  "Sikkim": "Gangtok",
  "Gujarat": "Ahmedabad,Surat,Vadodara,Rajkot,Bhavnagar,Jamnagar,Junagadh,Gandhinagar,Gandhidham,Anand,Navsari,Morbi,Nadiad,Surendranagar,Bharuch,Mehsana,Bhuj,Porbandar,Palanpur,Valsad,Vapi,Godhra,Patan,Veraval,Amreli,Dahod,Botad,Ankleshwar,Kalol",
  "Maharashtra": "Mumbai,Pune,Nagpur,Thane,Nashik,Aurangabad,Solapur,Kalyan,Vasai-Virar,Navi Mumbai,Amravati,Kolhapur,Sangli,Malegaon,Jalgaon,Akola,Latur,Dhule,Ahmednagar,Chandrapur,Parbhani,Ichalkaranji,Jalna,Ambarnath,Bhiwandi,Nanded,Satara,Beed,Yavatmal,Gondia,Wardha,Osmanabad,Nandurbar,Ratnagiri,Panvel,Pimpri-Chinchwad,Mira-Bhayandar,Ulhasnagar,Bhusawal,Shirdi,Lonavala,Baramati,Karad",
  "Goa": "Panaji,Margao,Vasco da Gama,Mapusa,Ponda",
  "Karnataka": "Bengaluru,Mysuru,Hubballi,Mangaluru,Belagavi,Kalaburagi,Davanagere,Ballari,Vijayapura,Shivamogga,Tumakuru,Raichur,Bidar,Hospet,Udupi,Hassan,Gadag,Chitradurga,Mandya,Kolar,Chikkamagaluru,Bagalkot,Dharwad,Karwar,Madikeri",
  "Telangana": "Hyderabad,Secunderabad,Warangal,Nizamabad,Karimnagar,Khammam,Ramagundam,Mahbubnagar,Nalgonda,Adilabad,Suryapet,Siddipet,Mancherial",
  "Andhra Pradesh": "Visakhapatnam,Vijayawada,Guntur,Nellore,Kurnool,Rajahmundry,Tirupati,Kakinada,Kadapa,Anantapur,Vizianagaram,Eluru,Ongole,Nandyal,Machilipatnam,Adoni,Tenali,Chittoor,Hindupur,Proddatur,Bhimavaram,Madanapalle,Srikakulam,Amaravati,Dharmavaram,Gudivada,Narasaraopet",
  "Tamil Nadu": "Chennai,Coimbatore,Madurai,Tiruchirappalli,Salem,Tirunelveli,Tiruppur,Erode,Vellore,Thoothukudi,Dindigul,Thanjavur,Ranipet,Sivakasi,Karur,Udhagamandalam,Hosur,Nagercoil,Kanchipuram,Kumbakonam,Rajapalayam,Pudukkottai,Neyveli,Cuddalore,Tiruvannamalai,Namakkal,Pollachi,Karaikudi,Ambur,Krishnagiri,Kanyakumari",
  "Kerala": "Thiruvananthapuram,Kochi,Kozhikode,Thrissur,Kollam,Kannur,Alappuzha,Palakkad,Malappuram,Kottayam,Kasaragod,Pathanamthitta,Munnar,Thalassery,Guruvayur,Ernakulam,Idukki,Wayanad",
  "Puducherry": "Puducherry,Karaikal",
  "Andaman and Nicobar Islands": "Port Blair",
  "Dadra and Nagar Haveli and Daman and Diu": "Silvassa,Daman,Diu",
  "Lakshadweep": "Kavaratti",
};

export const CITY_DATA = Object.entries(RAW).flatMap(([state, list]) =>
  list.split(",").map((city) => ({ city: city.trim(), state }))
);

export const STATES = [...new Set(CITY_DATA.map((c) => c.state))].sort();
