import { autopostRouter } from "./router.ts";
export async function autopost() {
    const payload = { message: "PrimordiaOS autopost event" };
    const caption = await autopostRouter(payload);
    console.log("Autopost complete:", caption);
}
