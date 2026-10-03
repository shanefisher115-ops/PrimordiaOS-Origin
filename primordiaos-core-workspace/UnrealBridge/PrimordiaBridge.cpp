#include 'PrimordiaBridge.h'
#include 'Json.h'
void APrimordiaBridge::OnMessage(const FString& Msg) {
  TSharedPtr<FJsonObject> Obj;
  auto Reader = TJsonReaderFactory<>::Create(Msg);
  if (FJsonSerializer::Deserialize(Reader, Obj)) {
    FString Type = Obj->GetStringField('type');
    if (Type == 'SpawnPulse') { /* trigger Niagara pulse */ }
    if (Type == 'SpawnNebula') { /* trigger nebula */ }
  }
}