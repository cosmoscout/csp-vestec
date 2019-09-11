////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "Plugin.hpp"

#include "../../../src/cs-utils/utils.hpp"
#include "../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-utils/convert.hpp"

#include <VistaKernel/VistaSystem.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

EXPORT_FN cs::core::PluginBase *create()
{
  return new cs::vestec::Plugin;
}

EXPORT_FN void destroy(cs::core::PluginBase *pluginBase)
{
  delete pluginBase;
}

namespace cs::vestec
{

void from_json(const nlohmann::json& j, Plugin::Settings& o) {
  cs::core::parseSection("csp-vestec", [&] {
    o.mSomeInfo = cs::core::parseProperty<std::string>("vestec-info", j);
  });
}


Plugin::Plugin()
    : mProperties(std::make_shared<Properties>())
{
   
}

void Plugin::InitGUI()
{
    
}

void Plugin::init()
{
	std::cout << "Init: CosmoScout VR Plugin for the VESTEC EU project" << std::endl;
	m_pVESTEC_UI = new cs::gui::GuiItem("file://../share/resources/gui/vestecSidebar.html");
	mGuiManager->addGuiItem(m_pVESTEC_UI, 10);
	m_pVESTEC_UI->setRelSizeX(1.0f);
	m_pVESTEC_UI->setRelSizeY(1.0f);
	m_pVESTEC_UI->setRelPositionY(1.f);
	m_pVESTEC_UI->setRelPositionX(0.f);
	m_pVESTEC_UI->setRelOffsetY(-0.45f);
	m_pVESTEC_UI->setRelOffsetX(0.5f);
	m_pVESTEC_UI->waitForFinishedLoading();

	//Read the plugin settings from the scene config
	mPluginSettings = mAllSettings->mPlugins.at("csp-vestec");

	// add anchor node and register to solar system
	mVestecTransform = std::make_shared<cs::scene::CelestialAnchorNode>(mSceneGraph->GetRoot(), mSceneGraph->GetNodeBridge(), "", "Earth", "IAU_Earth");
	mSolarSystem->registerAnchor(mVestecTransform);

	//Initialize and append gui elements
	InitGUI();

	std::cout << "[CSP::VESTEC ::Initialize()] Init  done #########################"<< std::endl;
}

void Plugin::deInit()
{
  mSolarSystem->unregisterAnchor(mVestecTransform);
  mSceneGraph->GetRoot()->DisconnectChild(mVestecTransform.get());
}

void Plugin::update()
{
   auto  simTime = mTimeControl->pSimulationTime.get();
   float timeOfDay = cs::utils::convert::toBoostTime(simTime).time_of_day().total_milliseconds() / 1000.0;
   //Update plugin per frame  
}

} // namespace cs::vestec
