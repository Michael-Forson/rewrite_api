import { createApp } from "./createApp";
const PORT =3000
const app= createApp()

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})

