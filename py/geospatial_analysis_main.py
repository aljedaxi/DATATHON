import streamlit as st
import pandas as pd

import requests, json, re, folium
from bs4 import BeautifulSoup
from streamlit_folium import st_folium


st.set_page_config(
    page_title="GeoSpacial Analysis",
    page_icon="globe_with_meridians",
    layout="wide")

st.markdown("<h1 style='text-align:center; color:cyan;'>Data For Good - Jumpstart Refugee Talent Datathon <br> Geo Spatial Analysis</h1>", unsafe_allow_html=True)
st.subheader('Data overview:')
st.markdown("""
```Client: ```A refugee in Canada who is looking for support with meaningful employment and entrepreneurial opportunities or related supports (i.e. resume).  
```Mentor: ```A professional working in Canada who has volunteered to mentor refugees who are looking to find meaningful employment in their industry.  
```Organization: ```An organization (corporate, non-profit, government, etc.) who provides position(s) to JRT, so they can get potential candidates who they could interview and hire for the position(s).  
```Position: ```A job opening, sent by an organization to JRT, that could potentially be filled by a JRT client.  
```Referal: ```As part of the Employment Support program, when a client looks like a potential fit for a position (a potential referral), they are added to this table. Further vetting will determine if their name is put forward as a referral to the organization posting the position (depending on the client's qualifications and level of interest).  
```Entrepreneurship: ```A client has applied for, or participated in, a cohort program(s) where a group of refugee entrepreneurs receive training (to date, the only 2 programs have been REinvest and HER Startup) and potentially get seed funding or other investments. And/or the client has a registered business in Canada. 
    then also regroup them to use fewer vehicles.  
```Mentorship: ```A relationship between a client and a mentor, to improve the client's employment profile, navigate their career path, and expand their professional networks.  
NOTE: One column of this data is contained within the Client table, re whether a client could be matched with a mentor.  
```(Resume): ```A JRT resume is a brief, consistently-formatted resume produced for all clients who sign up for mentorship or employment support. The resume team reviews, speaks with the client, and then prepares a resume for the client. The client, or program teams, can request future updates.  
```(WES Gateway - Educational Equivalence): ```In partnership with World Education Services, JRT can facilitate a request for education/credential recognition for a client. JRT fills out and submits the application to WES, and the client receives their credential recognition.  
NOTE: This data is contained within the Client table as there is only 1 row per Client.  
```Client Career Interests: ```Full-text of client's descriptions of what their Canadian job interests are. One text / client, with some additional information (esp employment, some demographic). This is a standalone table, not meant to be linked with the other data.. We provide the data in the original HTML form, also with HTML characters stripped out (which menas you lose some context, e.g. items as a list are not as easily separated, with the HTML tags removed).  
Note: this table was created as a stand-alone table, for text analysis.  
We have included some demographic and employment data within this table,  
but it is not meant to be joined to other tables. 
""")

st.header("Question 1")
st.markdown("""
Refugee Countries
""")

#Open Language by City dataset (search.open.canada.ca) processed by Jacob
language_df =  pd.read_csv("../data/languagesByCity.csv", index_col=0)
country_df = pd.read_csv("../data/CountryLatLong.csv", index_col=0)
client_df = pd.read_csv("../data/client_df.csv", index_col=0)

# dynamically get the world-country boundaries 
res = requests.get("https://raw.githubusercontent.com/python-visualization/folium/master/examples/data/world-countries.json")
df = pd.DataFrame(json.loads(res.content.decode()))
df = df.assign(id=df["features"].apply(pd.Series)["id"],
         name=df["features"].apply(pd.Series)["properties"].apply(pd.Series)["name"])

# build a dataframe of country colours scraped from wikipedia
resp = requests.get("https://en.wikipedia.org/wiki/National_colours",)
soup = BeautifulSoup(resp.content.decode(), "html.parser")
colours = []
for t in soup.find_all("table", class_="wikitable"):
    cols = t.find_all("th")
    ok = (len(cols)>5 and cols[0].string.strip()=="Country" and cols[4].string.strip()=="Primary")
    if ok:
        for tr in t.find_all("tr"):
            td = tr.find_all("td")
            if len(td)>5:
                sp = td[4].find_all("span")
                c1 = re.sub("background-color:([\w,#,0-9]*).*", r"\1", sp[0]["style"])
                c2 = c1 if len(sp)==1 else re.sub("background-color:([\w,#,0-9]*).*", r"\1", sp[1]["style"])
                colours.append({"country":td[0].find("a").string, 
                                "colour1":c1,
                                "colour2":c2,
                               })
dfc = pd.DataFrame(colours).set_index("country")  

# a list of interesting countries - Singapore is missing!
countries = list(country_df['name'])

# style the overlays with the countries own colors...
def style_fn(feature):
    cc = dfc.loc[feature["properties"]["name"]]
    ss= {'fillColor':f'{cc[0]}', 'color':f'{cc[1]}'}
    return ss

# create the base map
m = folium.Map(location=[12, 12],zoom_start=2)


# overlay desired countries over folium map
for r in df.loc[df["name"].isin(countries)].to_dict(orient="records"):
    folium.GeoJson(r["features"], name=r["name"], tooltip=r["name"], style_function=style_fn).add_to(m)

st_folium(m, width='100%', height=600, key="map")


st.header("Question 1")
st.markdown("""
Where do they settle
""")

map_zoo = folium.Map(location=[65,26], zoom_start=4)

for i, r in client_df.iterrows():
    folium.Marker(location=(r['Lat'], r['Lon']),
                  popup=r['REGION'],
                  tooltip='Click for more information!').add_to(map_zoo)
folium.LayerControl().add_to(map_zoo)

st_folium(map_zoo, width='100%', height=600, key="map")